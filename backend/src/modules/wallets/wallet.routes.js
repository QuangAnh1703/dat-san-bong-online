'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const wallet = require('../../services/wallet.service');

// Vi hoi vien (PRD 2.2.6): /api/wallets (nguoi choi), /api/wallets/owner (chu san), /api/wallets/admin (admin)
const router = express.Router();

const PLAN_COLS = 'id, venue_id, name, price, bonus, discount_percent, is_active';

// GET /api/wallets/venues/:venueId/plans - goi dang ban cua cum san (cong khai)
router.get('/venues/:venueId/plans', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ${PLAN_COLS} FROM membership_plan WHERE venue_id = $1 AND is_active ORDER BY price`,
      [Number(req.params.venueId)]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuthenticated);

const WALLET_SELECT = `
  SELECT w.id, w.venue_id, v.name AS venue_name, w.balance, w.status, w.updated_at,
         p.id AS plan_id, p.name AS plan_name, COALESCE(p.discount_percent, 0) AS discount_percent
    FROM member_wallet w JOIN venue v ON v.id = w.venue_id LEFT JOIN membership_plan p ON p.id = w.plan_id`;

// GET /api/wallets/mine - vi cua toi + giao dich gan day
router.get('/mine', async (req, res, next) => {
  try {
    const w = await query(`${WALLET_SELECT} WHERE w.user_id = $1 ORDER BY w.updated_at DESC`, [req.user.id]);
    const txns = await query(
      `SELECT t.wallet_id, t.type, t.amount, t.balance_after, t.note, t.created_at
         FROM wallet_txn t JOIN member_wallet w ON w.id = t.wallet_id
        WHERE w.user_id = $1 ORDER BY t.created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json({ data: w.rows.map((x) => ({ ...x, txns: txns.rows.filter((t) => t.wallet_id === x.id) })) });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallets/venues/:venueId/me - vi cua toi tai mot cum san (null neu chua co)
router.get('/venues/:venueId/me', async (req, res, next) => {
  try {
    const w = await query(`${WALLET_SELECT} WHERE w.user_id = $1 AND w.venue_id = $2`, [
      req.user.id,
      Number(req.params.venueId),
    ]);
    res.json({ wallet: w.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/topups  body: { plan_id } -> thong tin chuyen khoan VietQR, noi dung NAP <ma>
router.post('/topups', async (req, res, next) => {
  try {
    requireFields(req.body, ['plan_id']);
    const out = await withTransaction(async (c) => {
      const p = await c.query(
        `SELECT p.*, v.name AS venue_name, v.status AS venue_status, v.bank_name, v.bank_account, v.bank_holder
           FROM membership_plan p JOIN venue v ON v.id = p.venue_id WHERE p.id = $1 AND p.is_active`,
        [Number(req.body.plan_id)]
      );
      const plan = p.rows[0];
      if (!plan) throw new AppError('NOT_FOUND', { message: 'Gói thành viên không tồn tại hoặc đã ngừng bán' });
      if (plan.venue_status !== 'APPROVED') throw new AppError('VENUE_NOT_APPROVED');
      if (!plan.bank_account) throw new AppError('INVALID_OPERATION', { message: 'Cụm sân chưa cấu hình tài khoản nhận tiền' });
      const w = await c.query(`SELECT status FROM member_wallet WHERE user_id = $1 AND venue_id = $2`, [req.user.id, plan.venue_id]);
      if (w.rows[0]?.status === 'FROZEN') throw new AppError('WALLET_FROZEN');
      // Lenh cu chua thanh toan cua cung goi thi huy, tranh nhieu ma cung luc
      await c.query(
        `UPDATE wallet_topup SET status = 'CANCELLED' WHERE user_id = $1 AND plan_id = $2 AND status = 'PENDING'`,
        [req.user.id, plan.id]
      );
      const code = wallet.makeTopupCode();
      const t = await c.query(
        `INSERT INTO wallet_topup (code, user_id, venue_id, plan_id, amount) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, code, amount, status, created_at`,
        [code, req.user.id, plan.venue_id, plan.id, plan.price]
      );
      return {
        topup: t.rows[0],
        plan: { name: plan.name, price: Number(plan.price), bonus: Number(plan.bonus), discount_percent: plan.discount_percent },
        transfer: {
          bank_name: plan.bank_name,
          bank_account: plan.bank_account,
          bank_holder: plan.bank_holder,
          amount: Number(plan.price),
          content: `NAP ${code}`,
        },
      };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// GET /api/wallets/topups/:code - trang thai lenh nap (frontend polling)
router.get('/topups/:code', async (req, res, next) => {
  try {
    const r = await query(`SELECT code, amount, status, paid_at FROM wallet_topup WHERE code = $1 AND user_id = $2`, [
      req.params.code,
      req.user.id,
    ]);
    if (r.rowCount === 0) throw new AppError('NOT_FOUND');
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/pay  body: { booking_code } - tra coc bang vi hoi vien cua cum san
router.post('/pay', async (req, res, next) => {
  try {
    requireFields(req.body, ['booking_code']);
    const out = await withTransaction((c) => wallet.payBooking(c, req.body.booking_code, req.user));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// ---------------- Chu san: cau hinh goi thanh vien ----------------
const owner = express.Router();
owner.use(requireRole('OWNER', 'ADMIN'));

async function assertVenue(c, venueId, user) {
  const v = await c.query(`SELECT owner_id FROM venue WHERE id = $1`, [venueId]);
  if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND');
  if (user.role !== 'ADMIN' && v.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
}

function parsePlan(b) {
  const name = String(b.name || '').trim();
  const price = Math.round(Number(b.price));
  const bonus = Math.round(Number(b.bonus || 0));
  const discount = Number(b.discount_percent || 0);
  if (!name || name.length > 60) throw new AppError('INVALID_FIELD', { details: { field: 'name' } });
  if (!(price >= 10000)) throw new AppError('INVALID_FIELD', { message: 'Số tiền nạp tối thiểu 10.000đ', details: { field: 'price' } });
  if (!(bonus >= 0)) throw new AppError('INVALID_FIELD', { details: { field: 'bonus' } });
  if (!Number.isInteger(discount) || discount < 0 || discount > 50) {
    throw new AppError('INVALID_FIELD', { message: 'Giảm giá 0-50%', details: { field: 'discount_percent' } });
  }
  return { name, price, bonus, discount, is_active: b.is_active === undefined ? true : Boolean(b.is_active) };
}

// GET /api/wallets/owner/venues/:id/plans - moi goi (ca goi ngung ban) + so vi dang hoat dong
owner.get('/venues/:id/plans', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenue({ query }, venueId, req.user);
    const [plans, stats] = await Promise.all([
      query(`SELECT ${PLAN_COLS} FROM membership_plan WHERE venue_id = $1 ORDER BY price`, [venueId]),
      query(
        `SELECT count(*) AS wallets, COALESCE(sum(balance), 0) AS balance FROM member_wallet WHERE venue_id = $1 AND status = 'ACTIVE'`,
        [venueId]
      ),
    ]);
    res.json({ data: plans.rows, wallets: Number(stats.rows[0].wallets), total_balance: Number(stats.rows[0].balance) });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/owner/venues/:id/plans  body: { name, price, bonus, discount_percent }
owner.post('/venues/:id/plans', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenue({ query }, venueId, req.user);
    const p = parsePlan(req.body || {});
    const r = await query(
      `INSERT INTO membership_plan (venue_id, name, price, bonus, discount_percent, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${PLAN_COLS}`,
      [venueId, p.name, p.price, p.bonus, p.discount, p.is_active]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/wallets/owner/plans/:id
owner.put('/plans/:id', async (req, res, next) => {
  try {
    const cur = await query(`SELECT venue_id FROM membership_plan WHERE id = $1`, [Number(req.params.id)]);
    if (cur.rowCount === 0) throw new AppError('NOT_FOUND');
    await assertVenue({ query }, cur.rows[0].venue_id, req.user);
    const p = parsePlan(req.body || {});
    const r = await query(
      `UPDATE membership_plan SET name = $2, price = $3, bonus = $4, discount_percent = $5, is_active = $6
        WHERE id = $1 RETURNING ${PLAN_COLS}`,
      [Number(req.params.id), p.name, p.price, p.bonus, p.discount, p.is_active]
    );
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.use('/owner', owner);

// ---------------- Admin: vi bi dong bang, hoan tien ----------------
const admin = express.Router();
admin.use(requireRole('ADMIN'));

// GET /api/wallets/admin/frozen
admin.get('/frozen', async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT w.id, w.balance, w.updated_at, v.name AS venue_name, u.phone,
              COALESCE(p.full_name, u.email, u.phone) AS user_name
         FROM member_wallet w JOIN venue v ON v.id = w.venue_id JOIN app_user u ON u.id = w.user_id
         LEFT JOIN user_profile p ON p.user_id = w.user_id
        WHERE w.status = 'FROZEN' AND w.balance > 0 ORDER BY w.balance DESC`
    );
    res.json({ count: r.rowCount, total: r.rows.reduce((s, x) => s + Number(x.balance), 0), data: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/admin/:id/refund  body: { note? } - da hoan tien cho nguoi choi ngoai he thong -> ve 0
admin.post('/:id/refund', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const w = await c.query(`SELECT id, user_id, balance, status FROM member_wallet WHERE id = $1 FOR UPDATE`, [
        Number(req.params.id),
      ]);
      if (w.rowCount === 0) throw new AppError('NOT_FOUND');
      const cur = w.rows[0];
      if (cur.status !== 'FROZEN' || Number(cur.balance) <= 0) {
        throw new AppError('INVALID_STATUS', { message: 'Chỉ hoàn ví đang đóng băng còn số dư' });
      }
      await wallet.addTxn(c, cur.id, 'ADMIN_REFUND', -Number(cur.balance), {
        note: String(req.body?.note || 'Admin hoàn trả số dư').slice(0, 200),
        by: req.user.id,
      });
      await wallet.notify(c, cur.user_id, 'WALLET_REFUNDED', 'Đã hoàn trả số dư ví hội viên', `Quản trị viên đã hoàn ${wallet.vnd(cur.balance)} cho bạn.`);
      return { id: cur.id, refunded: Number(cur.balance) };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.use('/admin', admin);

module.exports = router;
