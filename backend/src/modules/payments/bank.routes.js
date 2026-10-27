'use strict';
const express = require('express');
const crypto = require('crypto');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const bank = require('../../services/bank-match.service');

// Doi soat chuyen khoan VietQR tu dong (PRD 2.3.4). Gan truoc /api/payments vi webhook khong co token.
const router = express.Router();

const QUEUE_STATUSES = ['UNMATCHED', 'REFUND_PENDING'];

// GET /api/payments/bank/config - frontend biet co tu doi soat va che do gia lap khong
router.get('/config', (_req, res) => {
  res.json({ auto_match: true, mock: bank.config().mock });
});

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/payments/bank/webhook - dinh dang webhook SePay, header "Authorization: Apikey <BANK_WEBHOOK_API_KEY>"
router.post('/webhook', async (req, res, next) => {
  try {
    const { apiKey } = bank.config();
    const auth = String(req.headers.authorization || '');
    if (!apiKey || !safeEqual(auth.replace(/^Apikey\s+/i, ''), apiKey)) throw new AppError('BANK_WEBHOOK_UNAUTHORIZED');

    const p = req.body || {};
    // Chi xu ly tien vao; tien ra van tra thanh cong de cong khong gui lai
    if (p.transferType !== 'in') return res.json({ success: true, result: 'ignored' });
    const amount = Number(p.transferAmount);
    if (!p.id || !(amount > 0)) throw new AppError('VALIDATION_ERROR', { details: { fields: ['id', 'transferAmount'] } });

    const out = await withTransaction((c) =>
      bank.processIncoming(c, {
        provider: 'SEPAY',
        provider_txn_id: String(p.id),
        account_number: p.accountNumber,
        bank_name: p.gateway,
        amount,
        content: p.content || p.description || '',
        reference_code: p.referenceCode,
        // SePay gui gio Viet Nam khong kem mui gio
        transaction_at: p.transactionDate ? `${String(p.transactionDate).replace(' ', 'T')}+07:00` : null,
        raw: p,
      })
    );
    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/bank/mock-transfer  body: { booking_code?, amount?, content? }
// Gia lap ngan hang bao co khi chua cau hinh webhook (chi moi truong phat trien).
// Noi dung QUY / NAP / GIAI cung di qua day de test quy doi, nap vi, le phi giai.
router.post('/mock-transfer', requireAuthenticated, async (req, res, next) => {
  try {
    if (!bank.config().mock) throw new AppError('ROUTE_NOT_FOUND');
    const { booking_code } = req.body || {};
    if (!booking_code && !req.body?.content) throw new AppError('MISSING_FIELD', { details: { missing: ['content'] } });
    const out = await withTransaction(async (c) => {
      let amount = req.body.amount === undefined ? null : Number(req.body.amount);
      let content = req.body.content === undefined ? null : String(req.body.content);
      if (booking_code && (amount === null || content === null)) {
        const b = await c.query(`SELECT code, deposit_amount FROM booking WHERE code = $1`, [booking_code]);
        if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND');
        if (amount === null) amount = Number(b.rows[0].deposit_amount);
        if (content === null) content = `SANBONG ${b.rows[0].code}`;
      }
      if (!(amount > 0)) throw new AppError('INVALID_FIELD', { details: { field: 'amount' } });
      // Tien vao tai khoan cua doi tuong trong noi dung; sai noi dung thi gia lap tien vao tai khoan cum san cua don
      let acc = await bank.accountFor(c, content);
      if (!acc && booking_code) acc = await bank.accountFor(c, `SANBONG ${booking_code}`);
      return bank.processIncoming(c, {
        provider: 'MOCK',
        provider_txn_id: crypto.randomUUID(),
        account_number: acc?.bank_account || null,
        bank_name: acc?.bank_name || null,
        amount,
        content,
        transaction_at: new Date().toISOString(),
        raw: { mock: true, by: req.user.id, amount, content },
      });
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// --- Hang doi doi soat thu cong (chu san: giao dich vao tai khoan cum san cua minh; admin: tat ca) ---
router.use('/transactions', requireAuthenticated, requireRole('OWNER', 'ADMIN'));

// Chu san thay giao dich vao so tai khoan cua mot cum san minh so huu, hoac da gan voi don cua cum san minh
const OWNER_SCOPE = `(
  EXISTS (SELECT 1 FROM venue ov
           WHERE ov.owner_id = $1 AND ov.bank_account IS NOT NULL
             AND regexp_replace(ov.bank_account, '\\D', '', 'g') = regexp_replace(t.account_number, '\\D', '', 'g'))
  OR EXISTS (SELECT 1 FROM booking ob JOIN venue ov ON ov.id = ob.venue_id
              WHERE ob.id = t.booking_id AND ov.owner_id = $1))`;

const scopeParam = (user) => (user.role === 'ADMIN' ? null : user.id);
const scopeSql = `($1::bigint IS NULL OR ${OWNER_SCOPE})`;

// GET /api/payments/bank/transactions?status=UNMATCHED,REFUND_PENDING
router.get('/transactions', async (req, res, next) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(',') : QUEUE_STATUSES;
    const r = await query(
      `SELECT t.id, t.provider, t.account_number, t.bank_name, t.amount, t.content, t.reference_code,
              t.transaction_at, t.received_at, t.status, t.note, t.handled_at,
              b.code AS booking_code, b.status AS booking_status, b.deposit_amount, v.name AS venue_name,
              (SELECT p.full_name FROM user_profile p WHERE p.user_id = b.user_id) AS customer_name
         FROM bank_transaction t
         LEFT JOIN booking b ON b.id = t.booking_id
         LEFT JOIN venue v ON v.id = b.venue_id
        WHERE ${scopeSql} AND t.status = ANY($2)
        ORDER BY t.received_at DESC
        LIMIT 200`,
      [scopeParam(req.user), statuses]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

async function lockTxn(c, id, user) {
  const r = await c.query(`SELECT t.* FROM bank_transaction t WHERE t.id = $2 AND ${scopeSql} FOR UPDATE OF t`, [
    scopeParam(user),
    id,
  ]);
  if (r.rowCount === 0) throw new AppError('TRANSACTION_NOT_FOUND', { details: { id } });
  return r.rows[0];
}

// POST /api/payments/bank/transactions/:id/assign  body: { booking_code }
// Gan tay giao dich khach ghi sai noi dung vao dung don
router.post('/transactions/:id/assign', async (req, res, next) => {
  try {
    requireFields(req.body, ['booking_code']);
    const out = await withTransaction(async (c) => {
      const t = await lockTxn(c, Number(req.params.id), req.user);
      if (t.status !== 'UNMATCHED') throw new AppError('TRANSACTION_ALREADY_HANDLED', { details: { status: t.status } });
      const b = await bank.lockBooking(c, String(req.body.booking_code).trim().toUpperCase());
      if (!b) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.body.booking_code } });
      if (req.user.role !== 'ADMIN' && b.owner_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status)) {
        throw new AppError('INVALID_STATUS', { message: 'Đơn này đã được xác nhận cọc', details: { status: b.status } });
      }
      await c.query(`UPDATE bank_transaction SET handled_by = $2, handled_at = now() WHERE id = $1`, [t.id, req.user.id]);
      return bank.applyToBooking(c, t, b, req.user.id);
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/bank/transactions/:id/resolve  body: { action: REFUNDED | IGNORED, note? }
// REFUNDED: da hoan tien cho khach ngoai he thong; IGNORED: ghi nhan, khong can xu ly them
router.post('/transactions/:id/resolve', async (req, res, next) => {
  try {
    const { action, note } = req.body || {};
    if (!['REFUNDED', 'IGNORED'].includes(action)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'action', allowed: ['REFUNDED', 'IGNORED'] } });
    }
    const out = await withTransaction(async (c) => {
      const t = await lockTxn(c, Number(req.params.id), req.user);
      if (!QUEUE_STATUSES.includes(t.status)) {
        throw new AppError('TRANSACTION_ALREADY_HANDLED', { details: { status: t.status } });
      }
      const r = await c.query(
        `UPDATE bank_transaction SET status = $2, note = COALESCE($3, note), handled_by = $4, handled_at = now()
          WHERE id = $1 RETURNING id, status, note, handled_at`,
        [t.id, action, note ? String(note).slice(0, 300) : null, req.user.id]
      );
      return r.rows[0];
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
