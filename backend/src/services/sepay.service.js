'use strict';
const crypto = require('crypto');

/**
 * SePay API Ngan hang & Webhook (https://docs.sepay.vn): khach quet VietQR chuyen vao tai khoan da lien ket SePay,
 * SePay goi webhook khi tien ve.
 */
function config() {
  const real = !!process.env.SEPAY_WEBHOOK_API_KEY;
  return {
    enabled: real || process.env.NODE_ENV !== 'production',
    apiKey: process.env.SEPAY_WEBHOOK_API_KEY || '',
    // Ten ngan hang theo danh sach cua qr.sepay.vn (VD: MBBank, Vietcombank, TPBank, ACB)
    bankCode: process.env.SEPAY_BANK_CODE || '',
    bankAccount: process.env.SEPAY_BANK_ACCOUNT || '',
    bankHolder: process.env.SEPAY_BANK_HOLDER || '',
  };
}

function qrUrl({ amount, content }) {
  const cfg = config();
  if (!cfg.bankCode || !cfg.bankAccount) return null;
  const qs = new URLSearchParams({
    acc: cfg.bankAccount,
    bank: cfg.bankCode,
    amount: String(Math.round(Number(amount))),
    des: content,
    template: 'compact',
  });
  return `https://qr.sepay.vn/img?${qs}`;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Header "Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>" (kieu xac thuc API Key khi tao webhook tren SePay) */
function verifyWebhook(authHeader) {
  const cfg = config();
  if (!cfg.apiKey) return false;
  return safeEqual(String(authHeader || '').replace(/^Apikey\s+/i, ''), cfg.apiKey);
}

/**
 * Ma don co the bi ngan hang dinh lien voi chu khac (VD "BK261108JJC4F CHUYEN TIEN") -> tra danh sach ung vien
 * dai den ngan de doi chieu CSDL. Ma don: BK + yymmdd + 3-5 ky tu.
 */
function bookingCodeCandidates(content) {
  const m = String(content || '')
    .toUpperCase()
    .match(/BK\d{6}[A-Z0-9]{3,5}/);
  if (!m) return [];
  const out = [];
  for (let len = m[0].length; len >= 11; len--) out.push(m[0].slice(0, len));
  return out;
}

module.exports = { config, qrUrl, verifyWebhook, bookingCodeCandidates };
