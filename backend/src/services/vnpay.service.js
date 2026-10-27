'use strict';
const crypto = require('crypto');

/**
 * Cong VNPay (API v2.1.0). Chua cau hinh VNPAY_TMN_CODE / VNPAY_HASH_SECRET va khong phai production
 * -> chay che do gia lap: URL thanh toan tro ve trang mock cua backend, van ky / kiem chu ky that.
 */
function config() {
  const backend = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const real = !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
  return {
    mock: !real,
    enabled: real || process.env.NODE_ENV !== 'production',
    tmnCode: process.env.VNPAY_TMN_CODE || 'MOCKTMN',
    secret: process.env.VNPAY_HASH_SECRET || 'sanbong-vnpay-mock-secret',
    payUrl: real
      ? process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
      : `${backend}/api/payments/vnpay/mock`,
    returnUrl: process.env.VNPAY_RETURN_URL || `${backend}/api/payments/vnpay/return`,
  };
}

// VNPay ma hoa kieu application/x-www-form-urlencoded (khoang trang -> '+'), sap xep key theo alphabet
function signData(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`)
    .join('&');
}

function hmac(secret, data) {
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
}

/** yyyyMMddHHmmss theo gio Viet Nam (GMT+7) */
function vnTime(date) {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function buildPaymentUrl({ txnRef, amount, orderInfo, ipAddr, expiresAt }) {
  const cfg = config();
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: Math.round(Number(amount)) * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: vnTime(new Date()),
    vnp_ExpireDate: vnTime(expiresAt),
  };
  const data = signData(params);
  return `${cfg.payUrl}?${data}&vnp_SecureHash=${hmac(cfg.secret, data)}`;
}

/** Kiem chu ky tham so VNPay gui ve (return URL / IPN) */
function verify(query) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  if (!vnp_SecureHash) return false;
  const expected = hmac(config().secret, signData(rest));
  const a = Buffer.from(String(vnp_SecureHash).toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Che do gia lap: tao bo tham so ket qua co chu ky giong VNPay tra ve */
function mockResult(query, success) {
  const params = {
    vnp_Amount: query.vnp_Amount,
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: query.vnp_OrderInfo,
    vnp_PayDate: vnTime(new Date()),
    vnp_ResponseCode: success ? '00' : '24',
    vnp_TmnCode: query.vnp_TmnCode,
    vnp_TransactionNo: success ? String(Date.now()).slice(-8) : '0',
    vnp_TransactionStatus: success ? '00' : '02',
    vnp_TxnRef: query.vnp_TxnRef,
  };
  const data = signData(params);
  return `${data}&vnp_SecureHash=${hmac(config().secret, data)}`;
}

module.exports = { config, buildPaymentUrl, verify, mockResult };
