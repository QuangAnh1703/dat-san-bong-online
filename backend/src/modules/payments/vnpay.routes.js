'use strict';
const express = require('express');
const crypto = require('crypto');
const { withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const vnpay = require('../../services/vnpay.service');

// Thanh toan coc qua VNPay. Gan truoc /api/payments vi return / IPN / mock khong co token.
const router = express.Router();

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// POST /api/payments/vnpay  body: { booking_code } -> { payment_url }
router.post('/', requireAuthenticated, async (req, res, next) => {
  try {
    requireFields(req.body, ['booking_code']);
    const cfg = vnpay.config();
    if (!cfg.enabled) throw new AppError('PAYMENT_GATEWAY_NOT_CONFIGURED');

    const out = await withTransaction(async (c) => {
      const b = await c.query(
        `SELECT b.id, b.code, b.status, b.user_id, b.deposit_amount, b.hold_expires_at, v.name AS venue_name
           FROM booking b JOIN venue v ON v.id = b.venue_id
          WHERE b.code = $1 FOR UPDATE OF b`,
        [req.body.booking_code]
      );
      if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND');
      const booking = b.rows[0];
      if (booking.user_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (booking.status !== 'HELD') throw new AppError('INVALID_STATUS', { details: { status: booking.status } });
      const expiresAt = booking.hold_expires_at ? new Date(booking.hold_expires_at) : null;
      if (!expiresAt || expiresAt <= new Date()) throw new AppError('HOLD_EXPIRED');

      // Moi lan bam thanh toan la mot giao dich moi; giao dich cu chua xong thi huy
      await c.query(
        `UPDATE payment SET status = 'CANCELLED', updated_at = now()
          WHERE booking_id = $1 AND method = 'VNPAY' AND status = 'PENDING'`,
        [booking.id]
      );
      const txnRef = `${booking.code}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await c.query(
        `INSERT INTO payment (booking_id, method, status, amount, provider_ref, expires_at)
         VALUES ($1, 'VNPAY', 'PENDING', $2, $3, $4)`,
        [booking.id, booking.deposit_amount, txnRef, expiresAt]
      );
      return {
        payment_url: vnpay.buildPaymentUrl({
          txnRef,
          amount: booking.deposit_amount,
          orderInfo: `Coc dat san ${booking.code}`,
          ipAddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].replace('::ffff:', ''),
          // Cong tu tu choi khi qua han giu cho -> khong co chuyen tra tien cho don da het han
          expiresAt,
        }),
        txn_ref: txnRef,
        mock: cfg.mock,
      };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

/**
 * Ap ket qua VNPay vao CSDL (dung chung cho return URL va IPN, chay lai nhieu lan van an toan).
 * Tra ve { rsp: ma phan hoi IPN, bookingCode, result: success | failed | invalid }
 */
async function applyResult(params) {
  if (!vnpay.verify(params)) return { rsp: '97', result: 'invalid' };
  const txnRef = String(params.vnp_TxnRef || '');
  const success = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

  return withTransaction(async (c) => {
    const p = await c.query(
      `SELECT pm.*, b.code AS booking_code, b.status AS booking_status, b.user_id, v.owner_id, v.name AS venue_name
         FROM payment pm JOIN booking b ON b.id = pm.booking_id JOIN venue v ON v.id = b.venue_id
        WHERE pm.provider_ref = $1 FOR UPDATE OF pm, b`,
      [txnRef]
    );
    if (p.rowCount === 0) return { rsp: '01', result: 'invalid' };
    const pm = p.rows[0];
    if (Math.round(Number(pm.amount)) * 100 !== Number(params.vnp_Amount)) {
      return { rsp: '04', result: 'invalid', bookingCode: pm.booking_code };
    }

    await c.query(
      `INSERT INTO payment_transaction (payment_id, type, amount, provider, provider_txn_no, response_code,
                                        signature_valid, raw_payload)
       VALUES ($1, 'DEPOSIT', $2, 'VNPAY', $3, $4, TRUE, $5)
       ON CONFLICT (provider, provider_txn_no, type) DO NOTHING`,
      [pm.id, pm.amount, `${txnRef}:${params.vnp_TransactionNo || '0'}`, params.vnp_ResponseCode, params]
    );

    // Da xu ly roi (IPN goi lai / nguoi dung F5 trang ket qua)
    if (pm.status !== 'PENDING') {
      return { rsp: '02', result: pm.status === 'SUCCESS' ? 'success' : 'failed', bookingCode: pm.booking_code };
    }

    if (!success) {
      await c.query(`UPDATE payment SET status = 'FAILED', updated_at = now() WHERE id = $1`, [pm.id]);
      return { rsp: '00', result: 'failed', bookingCode: pm.booking_code };
    }

    await c.query(
      `UPDATE payment SET status = 'SUCCESS', paid_at = now(), provider_txn_no = $2, bank_code = $3, updated_at = now()
        WHERE id = $1`,
      [pm.id, params.vnp_TransactionNo || null, params.vnp_BankCode || null]
    );

    if (['HELD', 'PENDING_VERIFY'].includes(pm.booking_status)) {
      await c.query(
        `UPDATE booking SET status = 'CONFIRMED', confirmed_at = now(), hold_expires_at = NULL WHERE id = $1`,
        [pm.booking_id]
      );
      await c.query(`UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`, [
        pm.booking_id,
      ]);
      await c.query(
        `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES
           ($1, 'BOOKING_CONFIRMED', $3, $4, 'BOOKING', $6),
           ($2, 'BOOKING_PAID', $5, $4, 'BOOKING', $6)`,
        [
          pm.user_id,
          pm.owner_id,
          `Đặt sân thành công · ${pm.booking_code}`,
          `Đã nhận ${Number(pm.amount).toLocaleString('vi-VN')}đ tiền cọc qua VNPay tại ${pm.venue_name}.`,
          `Đơn ${pm.booking_code} đã thanh toán cọc qua VNPay`,
          pm.booking_id,
        ]
      );
      return { rsp: '00', result: 'success', bookingCode: pm.booking_code };
    }

    // Tien ve sau khi don da het han / bi huy: ghi nhan de hoan qua khieu nai
    await c.query(
      `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id)
       VALUES ($1, 'PAYMENT_AFTER_CANCEL', $2, $3, 'BOOKING', $4)`,
      [
        pm.user_id,
        `Đơn ${pm.booking_code} không còn hiệu lực`,
        'Đã nhận tiền cọc nhưng đơn đã hết hạn giữ chỗ hoặc bị hủy. Hãy gửi khiếu nại để được hoàn tiền.',
        pm.booking_id,
      ]
    );
    return { rsp: '00', result: 'late', bookingCode: pm.booking_code };
  });
}

// GET /api/payments/vnpay/return - trinh duyet quay ve tu cong -> chuyen sang trang ket qua cua frontend
router.get('/return', async (req, res, next) => {
  try {
    const r = await applyResult(req.query);
    const qs = new URLSearchParams({ status: r.result, ...(r.bookingCode && { code: r.bookingCode }) });
    res.redirect(`${FRONTEND_URL()}/thanh-toan/ket-qua?${qs}`);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/vnpay/ipn - VNPay goi server-to-server, tra { RspCode, Message } theo dac ta VNPay
router.get('/ipn', async (req, res) => {
  const MESSAGES = {
    '00': 'Confirm Success',
    '01': 'Order not found',
    '02': 'Order already confirmed',
    '04': 'Invalid amount',
    '97': 'Invalid signature',
  };
  try {
    const r = await applyResult(req.query);
    res.json({ RspCode: r.rsp, Message: MESSAGES[r.rsp] });
  } catch (err) {
    console.error('[vnpay] IPN loi: %s', err.message);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// GET /api/payments/vnpay/mock - trang cong gia lap (chi khi chua cau hinh VNPay, khong phai production)
router.get('/mock', (req, res, next) => {
  const cfg = vnpay.config();
  if (!cfg.mock || process.env.NODE_ENV === 'production') return next(new AppError('ROUTE_NOT_FOUND'));
  if (!vnpay.verify(req.query)) return res.status(400).type('text').send('Sai chu ky VNPay');

  const amount = (Number(req.query.vnp_Amount) / 100).toLocaleString('vi-VN');
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const url = (ok) => `${cfg.returnUrl}?${vnpay.mockResult(req.query, ok)}`;
  res.type('html').send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VNPay (giả lập) - SanBong.vn</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
  .card{background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);max-width:420px;width:100%;padding:28px}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px}
  h1{font-size:20px;margin:12px 0 4px;color:#0f172a} p{color:#475569;font-size:14px;margin:4px 0}
  .amount{font-size:30px;font-weight:800;color:#005baa;margin:16px 0}
  a{display:block;text-align:center;padding:12px;border-radius:10px;font-weight:700;text-decoration:none;margin-top:10px}
  .ok{background:#005baa;color:#fff}.no{background:#e2e8f0;color:#334155}
</style></head>
<body><div class="card">
  <span class="badge">Cổng VNPay giả lập · chỉ dùng khi phát triển</span>
  <h1>Thanh toán tiền cọc</h1>
  <p>${esc(req.query.vnp_OrderInfo)}</p>
  <p>Mã giao dịch: ${esc(req.query.vnp_TxnRef)}</p>
  <div class="amount">${amount}đ</div>
  <a class="ok" href="${esc(url(true))}">Thanh toán thành công</a>
  <a class="no" href="${esc(url(false))}">Hủy giao dịch</a>
</div></body></html>`);
});

module.exports = router;
