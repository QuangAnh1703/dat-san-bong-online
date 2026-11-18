'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const sepay = require('../../services/sepay.service');
const { settlePaidDeposit } = require('../../services/deposit.service');

// Thanh toan coc bang VietQR + webhook ngan hang SePay. Webhook khong co token nen router tu gan auth tung route.
const router = express.Router();

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

async function receivedFor(db, bookingId) {
  const r = await db.query(
    `SELECT COALESCE(sum(t.amount), 0) AS s FROM payment_transaction t JOIN payment pm ON pm.id = t.payment_id
      WHERE pm.booking_id = $1 AND pm.method = 'SEPAY' AND t.provider = 'SEPAY'`,
    [bookingId]
  );
  return Number(r.rows[0].s);
}

// GET /api/payments/sepay/:code - thong tin chuyen khoan + link anh QR cho o thanh toan coc
router.get('/:code', requireAuthenticated, async (req, res, next) => {
  try {
    const cfg = sepay.config();
    if (!cfg.enabled) throw new AppError('PAYMENT_GATEWAY_NOT_CONFIGURED');
    const b = await query(`SELECT id, code, status, user_id, deposit_amount, hold_expires_at FROM booking WHERE code = $1`, [
      req.params.code,
    ]);
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND');
    const booking = b.rows[0];
    if (booking.user_id !== req.user.id) throw new AppError('FORBIDDEN');

    const received = await receivedFor({ query }, booking.id);
    const remaining = Math.max(Number(booking.deposit_amount) - received, 0);
    const content = booking.code;
    res.json({
      booking_code: booking.code,
      status: booking.status,
      deposit_amount: Number(booking.deposit_amount),
      received,
      remaining,
      hold_expires_at: booking.hold_expires_at,
      bank_code: cfg.bankCode || null,
      bank_account: cfg.bankAccount || null,
      bank_holder: cfg.bankHolder || null,
      content,
      qr_url: remaining > 0 ? sepay.qrUrl({ amount: remaining, content }) : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Tien vao tai khoan: tim don theo ma trong noi dung, cong don cac lan chuyen, du coc thi xac nhan.
 * Chay lai cung id giao dich -> duplicate (UNIQUE provider + provider_txn_no + type).
 */
async function processIncoming(c, { txnId, amount, content, raw }) {
  let b = null;
  for (const code of sepay.bookingCodeCandidates(content)) {
    const r = await c.query(
      `SELECT b.id AS booking_id, b.code AS booking_code, b.status AS booking_status, b.user_id, b.deposit_amount,
              v.owner_id, v.name AS venue_name
         FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.code = $1 FOR UPDATE OF b`,
      [code]
    );
    if (r.rowCount) {
      b = r.rows[0];
      break;
    }
  }
  if (!b) return { result: 'unmatched' };

  // Moi don mot dong payment SEPAY, cac lan chuyen la cac payment_transaction
  let pm = (
    await c.query(`SELECT * FROM payment WHERE booking_id = $1 AND method = 'SEPAY' ORDER BY id DESC LIMIT 1 FOR UPDATE`, [
      b.booking_id,
    ])
  ).rows[0];
  if (!pm) {
    pm = (
      await c.query(
        `INSERT INTO payment (booking_id, method, status, amount, provider_ref) VALUES ($1, 'SEPAY', 'PENDING', $2, $3)
         RETURNING *`,
        [b.booking_id, b.deposit_amount, `QR-${b.booking_code}`]
      )
    ).rows[0];
  }

  const ins = await c.query(
    `INSERT INTO payment_transaction (payment_id, type, amount, provider, provider_txn_no, response_code,
                                      signature_valid, raw_payload)
     VALUES ($1, 'DEPOSIT', $2, 'SEPAY', $3, 'IN', TRUE, $4)
     ON CONFLICT (provider, provider_txn_no, type) DO NOTHING`,
    [pm.id, amount, txnId, raw]
  );
  if (ins.rowCount === 0) return { result: 'duplicate', booking_code: b.booking_code };
  if (pm.status === 'SUCCESS') return { result: 'already_paid', booking_code: b.booking_code };

  const received = await receivedFor(c, b.booking_id);
  if (received < Number(b.deposit_amount)) {
    await c.query(
      `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id)
       VALUES ($1, 'PAYMENT_UNDERPAID', $2, $3, 'BOOKING', $4)`,
      [
        b.user_id,
        `Đơn ${b.booking_code} còn thiếu tiền cọc`,
        `Đã nhận ${vnd(received)} / ${vnd(b.deposit_amount)}. Vui lòng chuyển thêm ${vnd(Number(b.deposit_amount) - received)} với nội dung ${b.booking_code}.`,
        b.booking_id,
      ]
    );
    return { result: 'underpaid', booking_code: b.booking_code, received };
  }

  const result = await settlePaidDeposit(c, { ...pm, ...b, id: pm.id, amount: received }, { gateway: 'SePay', txnNo: txnId });
  return { result: result === 'success' ? 'confirmed' : 'late', booking_code: b.booking_code };
}

// POST /api/payments/sepay/webhook - SePay goi khi tai khoan co bien dong, header "Authorization: Apikey <key>"
router.post('/webhook', async (req, res, next) => {
  try {
    if (!sepay.verifyWebhook(req.headers.authorization)) {
      console.warn('[sepay] webhook sai / thieu API key');
      throw new AppError('BANK_WEBHOOK_UNAUTHORIZED');
    }
    const p = req.body || {};
    // Tien ra van tra thanh cong de SePay khong gui lai
    if (p.transferType !== 'in') return res.json({ success: true, result: 'ignored' });
    const amount = Number(p.transferAmount);
    if (!p.id || !(amount > 0)) throw new AppError('VALIDATION_ERROR', { details: { fields: ['id', 'transferAmount'] } });

    const out = await withTransaction((c) =>
      processIncoming(c, { txnId: String(p.id), amount, content: `${p.code || ''} ${p.content || ''}`, raw: p })
    );
    console.log('[sepay] webhook giao dich %s %s -> %s %s', p.id, vnd(amount), out.result, out.booking_code || '');
    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
