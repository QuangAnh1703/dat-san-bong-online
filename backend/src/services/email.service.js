'use strict';
const nodemailer = require('nodemailer');

let transporter;

async function initializeEmail() {
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
    console.error('[email] Gmail config error:', err.message);
    throw err;
  }
}

async function sendOtpEmail(email, otp) {
  if (!transporter) await initializeEmail();

  const mailOptions = {
    from: process.env.GMAIL_USER,
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
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] OTP sent to ${email}`);
    return info;
  } catch (err) {
    console.error(`[email] Failed to send OTP to ${email}:`, err.message);
    throw err;
  }
}

module.exports = { initializeEmail, sendOtpEmail };
