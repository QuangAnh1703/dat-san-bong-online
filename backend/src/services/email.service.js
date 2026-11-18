'use strict';
const nodemailer = require('nodemailer');

let transporter;

// Render goi free chan cong SMTP -> co BREVO_API_KEY thi gui qua HTTP API cua Brevo thay vi Gmail SMTP
const useBrevo = () => Boolean(process.env.BREVO_API_KEY);
const fromAddress = () => process.env.EMAIL_FROM || process.env.GMAIL_USER;

async function initializeEmail() {
  if (useBrevo()) {
    if (!fromAddress()) throw new Error('thieu EMAIL_FROM (email nguoi gui da xac minh tren Brevo)');
    console.log('[email] dung Brevo HTTP API, nguoi gui %s', fromAddress());
    return;
  }
  if (transporter) return;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Test connection
  try {
    await transporter.verify();
    console.log('[email] Gmail configured successfully');
  } catch (err) {
    transporter = undefined;
    console.error('[email] Gmail config error:', err.message);
    throw err;
  }
}

async function sendViaBrevo({ to, subject, html, attachments = [] }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: fromAddress(), name: 'SanBong.vn' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(attachments.length && {
        attachment: attachments.map((a) => ({ name: a.filename, content: Buffer.from(a.content).toString('base64') })),
      }),
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sendMail(mail) {
  if (useBrevo()) return sendViaBrevo(mail);
  if (!transporter) await initializeEmail();
  return transporter.sendMail({ from: fromAddress(), ...mail });
}

async function sendOtpEmail(email, otp) {
  const mailOptions = {
    to: email,
    subject: 'Mã xác minh OTP - SanBong.vn',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #146B4A;">Xác minh email của bạn</h2>
        <p>Cảm ơn bạn đã đăng ký tại <strong>SanBong.vn</strong></p>
        <p>Mã xác minh OTP của bạn là:</p>
        <div style="background: #f5f7f1; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #146B4A; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">
          Mã này có hiệu lực trong <strong>15 phút</strong>. Đừng chia sẻ mã này với ai.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
  };

  try {
    const info = await sendMail(mailOptions);
    console.log(`[email] OTP sent to ${email}`);
    return info;
  } catch (err) {
    console.error(`[email] Failed to send OTP to ${email}:`, err.message);
    throw err;
  }
}

/** Gui email kem file dinh kem (vd. bao cao xuat nen cho Admin) */
async function sendMailWithAttachment({ to, subject, html, filename, content }) {
  return sendMail({
    to,
    subject,
    html,
    attachments: [{ filename, content, contentType: 'text/csv; charset=utf-8' }],
  });
}

module.exports = { initializeEmail, sendOtpEmail, sendMailWithAttachment };
