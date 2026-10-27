'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const split = require('../../services/split.service');

// So quy & chia tien tran (PRD 2.1.8)
const router = express.Router();
router.use(requireAuthenticated);

const MODES = ['EQUAL', 'SPONSOR', 'CUSTOM'];
const PHONE_RE = /^0\d{9}$/;
const PLAYABLE = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

async function loadBooking(c, code, lock = false) {
  const r = await c.query(
    `SELECT b.id, b.code, b.status, b.user_id, b.team_id, b.total_amount,
            (SELECT min(lower(s.time_range)) FROM booking_slot s WHERE s.booking_id = b.id) AS starts_at,
            (SELECT COALESCE(sum(o.total), 0) FROM service_order o WHERE o.booking_id = b.id) AS pos_total,
            v.name AS venue_name
       FROM booking b JOIN venue v ON v.id = b.venue_id
      WHERE b.code = $1 ${lock ? 'FOR UPDATE OF b' : ''}`,
    [code]
  );
  if (r.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code } });
  return r.rows[0];
}

async function myPhone(c, userId) {
  const r = await c.query(`SELECT phone FROM app_user WHERE id = $1`, [userId]);
  return r.rows[0]?.phone || null;
}

// Doi truong = nguoi dat don
function assertCaptain(booking, user) {
  if (booking.user_id !== user.id) throw new AppError('FORBIDDEN', { message: 'Chỉ đội trưởng (người đặt sân) được chia tiền' });
}

async function loadBill(c, bookingId) {
  const bill = await c.query(
    `SELECT sb.*, t.name AS team_name, t.fund_balance FROM split_bill sb LEFT JOIN team t ON t.id = sb.team_id
      WHERE sb.booking_id = $1`,
    [bookingId]
  );
  if (bill.rowCount === 0) return null;
  const shares = await c.query(
    `SELECT id, user_id, name, phone, amount, status, paid_at, reminded_at FROM split_bill_share
      WHERE split_bill_id = $1 ORDER BY status = 'REASSIGNED', id`,
    [bill.rows[0].id]
  );
  return { ...bill.rows[0], shares: shares.rows };
}

// GET /api/splits/mine - cac khoan minh con phai dong
router.get('/mine', async (req, res, next) => {
  try {
    const phone = await myPhone({ query }, req.user.id);
    const r = await query(
      `SELECT s.id, s.amount, s.status, b.code AS booking_code, v.name AS venue_name, sb.due_at,
              (SELECT min(lower(bs.time_range)) FROM booking_slot bs WHERE bs.booking_id = b.id) AS starts_at,
              cp.full_name AS captain_name
         FROM split_bill_share s
         JOIN split_bill sb ON sb.id = s.split_bill_id
         JOIN booking b ON b.id = sb.booking_id
         JOIN venue v ON v.id = b.venue_id
         LEFT JOIN user_profile cp ON cp.user_id = sb.captain_id
        WHERE s.status = 'UNPAID' AND sb.status = 'OPEN' AND (s.user_id = $1 OR ($2::text IS NOT NULL AND s.phone = $2))
        ORDER BY sb.due_at`,
      [req.user.id, phone]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/splits/booking/:code - so quy tran (doi truong, thanh vien trong danh sach, nguoi tham gia tran)
router.get('/booking/:code', async (req, res, next) => {
  try {
    const db = { query };
    const b = await loadBooking(db, req.params.code);
    const bill = await loadBill(db, b.id);
    const phone = await myPhone(db, req.user.id);
    const isCaptain = b.user_id === req.user.id;
    const inBill = bill?.shares.some((s) => s.user_id === req.user.id || (phone && s.phone === phone));
    if (!isCaptain && !inBill && req.user.role !== 'ADMIN') {
      const p = await query(
        `SELECT 1 FROM match_participant WHERE booking_id = $1 AND user_id = $2 AND cancelled_at IS NULL`,
        [b.id, req.user.id]
      );
      if (p.rowCount === 0) throw new AppError('FORBIDDEN');
    }
    res.json({
      booking: {
        code: b.code,
        status: b.status,
        venue_name: b.venue_name,
        starts_at: b.starts_at,
        total: Number(b.total_amount) + Number(b.pos_total),
      },
      is_captain: isCaptain,
      my_phone: phone,
      bill,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/splits/booking/:code/candidates - thanh vien doi + chan le da ghep, de doi truong chon
router.get('/booking/:code/candidates', async (req, res, next) => {
  try {
    const db = { query };
    const b = await loadBooking(db, req.params.code);
    assertCaptain(b, req.user);
    const r = await query(
      `SELECT DISTINCT ON (u.id) u.id AS user_id, COALESCE(p.full_name, u.phone) AS name, u.phone, x.source
         FROM (SELECT tm.user_id, 'TEAM' AS source FROM team_member tm
                 JOIN team t ON t.id = tm.team_id WHERE t.captain_id = $2
               UNION ALL SELECT $2, 'CAPTAIN'
               UNION ALL SELECT mp.user_id, 'FREELANCE' FROM match_participant mp
                WHERE mp.booking_id = $1 AND mp.cancelled_at IS NULL) x
         JOIN app_user u ON u.id = x.user_id
         LEFT JOIN user_profile p ON p.user_id = u.id
        ORDER BY u.id, x.source = 'CAPTAIN' DESC`,
      [b.id, req.user.id]
    );
    const bank = await query(
      `SELECT bank_name, bank_account, bank_holder FROM split_bill WHERE captain_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({
      total: Number(b.total_amount) + Number(b.pos_total),
      field_and_online_services: Number(b.total_amount),
      pos_services: Number(b.pos_total),
      starts_at: b.starts_at,
      members: r.rows,
      last_bank: bank.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/splits/booking/:code
// body: { mode, sponsor_percent?, members: [{ user_id?, name, phone, amount? }], due_hours_before, bank_name, bank_account, bank_holder }
router.post('/booking/:code', async (req, res, next) => {
  try {
    const body = req.body || {};
    requireFields(body, ['mode', 'members', 'bank_name', 'bank_account', 'bank_holder']);
    if (!MODES.includes(body.mode)) throw new AppError('INVALID_FIELD', { details: { field: 'mode', allowed: MODES } });
    const sponsorPercent = body.mode === 'SPONSOR' ? Number(body.sponsor_percent) : 0;
    if (!Number.isInteger(sponsorPercent) || sponsorPercent < 0 || sponsorPercent > 100) {
      throw new AppError('INVALID_FIELD', { details: { field: 'sponsor_percent' } });
    }
    const members = Array.isArray(body.members) ? body.members : [];
    if (members.length < 1 || members.length > 30) throw new AppError('INVALID_FIELD', { details: { field: 'members', reason: '1-30 người' } });
    const phones = new Set();
    for (const m of members) {
      if (!PHONE_RE.test(String(m.phone || ''))) throw new AppError('INVALID_PHONE', { details: { phone: m.phone } });
      if (phones.has(m.phone)) throw new AppError('INVALID_FIELD', { message: `SĐT ${m.phone} bị trùng`, details: { field: 'members' } });
      phones.add(m.phone);
      if (!String(m.name || '').trim()) throw new AppError('INVALID_FIELD', { details: { field: 'name' } });
    }
    const dueHours = body.due_hours_before === undefined ? 2 : Number(body.due_hours_before);
    if (!(dueHours >= 0 && dueHours <= 72)) throw new AppError('INVALID_FIELD', { details: { field: 'due_hours_before' } });
    if (!/^\d{6,20}$/.test(String(body.bank_account))) throw new AppError('INVALID_FIELD', { details: { field: 'bank_account' } });

    const out = await withTransaction(async (c) => {
      const b = await loadBooking(c, req.params.code, true);
      assertCaptain(b, req.user);
      if (!PLAYABLE.includes(b.status)) {
        throw new AppError('INVALID_STATUS', { message: 'Chỉ chia tiền cho trận đã xác nhận', details: { status: b.status } });
      }
      const exists = await c.query(`SELECT 1 FROM split_bill WHERE booking_id = $1`, [b.id]);
      if (exists.rowCount > 0) throw new AppError('SPLIT_EXISTS');

      const total = Number(b.total_amount) + Number(b.pos_total);
      const { amounts, sponsor, surplus } = split.computeShares({ mode: body.mode, total, sponsorPercent, members });
      const team = await c.query(`SELECT id FROM team WHERE captain_id = $1`, [req.user.id]);
      // Han nhac no tinh tu gio bong lan; tran da qua gio thi han = bay gio + 1 ngay
      const start = b.starts_at ? new Date(b.starts_at) : new Date();
      let dueAt = new Date(start.getTime() - dueHours * 3_600_000);
      if (dueAt <= new Date()) dueAt = new Date(Date.now() + 24 * 3_600_000);

      const bill = await c.query(
        `INSERT INTO split_bill (booking_id, team_id, captain_id, mode, sponsor_percent, total_amount, sponsor_amount,
                                 surplus, bank_name, bank_account, bank_holder, due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          b.id,
          b.team_id || team.rows[0]?.id || null,
          req.user.id,
          body.mode,
          sponsorPercent,
          total,
          sponsor,
          surplus,
          String(body.bank_name).slice(0, 50),
          String(body.bank_account),
          String(body.bank_holder).slice(0, 120),
          dueAt,
        ]
      );
      const billId = bill.rows[0].id;
      for (const [i, m] of members.entries()) {
        const u = await c.query(`SELECT id FROM app_user WHERE phone = $1`, [m.phone]);
        const userId = u.rows[0]?.id || null;
        // Doi truong tu tra phan cua minh khi da dat san
        const isCaptain = userId === req.user.id;
        await c.query(
          `INSERT INTO split_bill_share (split_bill_id, user_id, name, phone, amount, status, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [billId, userId, String(m.name).trim().slice(0, 120), m.phone, amounts[i], isCaptain ? 'PAID' : 'UNPAID', isCaptain ? new Date() : null]
        );
        if (!isCaptain) {
          await split.notify(
            c,
            userId,
            'SPLIT_REQUEST',
            `Đóng ${split.vnd(amounts[i])} tiền trận ${b.code}`,
            `Đội trưởng đã chia tiền trận tại ${b.venue_name}. Mở sổ quỹ trận để quét VietQR (nội dung QUY ${b.code} ${m.phone}).`,
            b.id
          );
        }
      }
      await split.settleIfDone(c, billId);
      return loadBill(c, b.id);
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

async function lockShareForCaptain(c, shareId, user) {
  const r = await c.query(
    `SELECT s.*, sb.captain_id, sb.booking_id, sb.status AS bill_status FROM split_bill_share s
       JOIN split_bill sb ON sb.id = s.split_bill_id WHERE s.id = $1 FOR UPDATE OF s`,
    [shareId]
  );
  if (r.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy phần chia tiền' });
  if (r.rows[0].captain_id !== user.id) throw new AppError('FORBIDDEN');
  if (r.rows[0].status !== 'UNPAID') throw new AppError('INVALID_STATUS', { message: 'Thành viên này đã đóng hoặc đã được đổi' });
  return r.rows[0];
}

// POST /api/splits/shares/:id/mark-paid - doi truong xac nhan da thu (tien mat / chuyen khoan ngoai)
router.post('/shares/:id/mark-paid', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const s = await lockShareForCaptain(c, Number(req.params.id), req.user);
      await split.markSharePaid(c, s.id, 'PAID');
      return { id: s.id, status: 'PAID' };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/splits/shares/:id/pay-for - doi truong dong thay
router.post('/shares/:id/pay-for', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const s = await lockShareForCaptain(c, Number(req.params.id), req.user);
      await split.markSharePaid(c, s.id, 'PAID_BY_CAPTAIN');
      await split.notify(c, s.user_id, 'SPLIT_PAID_BY_CAPTAIN', 'Đội trưởng đã đóng thay bạn', `Khoản ${split.vnd(s.amount)} đã được đội trưởng đóng thay.`, s.booking_id);
      return { id: s.id, status: 'PAID_BY_CAPTAIN' };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/splits/shares/:id/reassign  body: { name, phone } - doi nguoi dong
router.post('/shares/:id/reassign', async (req, res, next) => {
  try {
    requireFields(req.body, ['name', 'phone']);
    if (!PHONE_RE.test(String(req.body.phone))) throw new AppError('INVALID_PHONE');
    const out = await withTransaction(async (c) => {
      const s = await lockShareForCaptain(c, Number(req.params.id), req.user);
      await c.query(`UPDATE split_bill_share SET status = 'REASSIGNED' WHERE id = $1`, [s.id]);
      const u = await c.query(`SELECT id FROM app_user WHERE phone = $1`, [req.body.phone]);
      const r = await c.query(
        `INSERT INTO split_bill_share (split_bill_id, user_id, name, phone, amount) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, name, phone, amount, status`,
        [s.split_bill_id, u.rows[0]?.id || null, String(req.body.name).trim().slice(0, 120), req.body.phone, s.amount]
      );
      const code = (await c.query(`SELECT code FROM booking WHERE id = $1`, [s.booking_id])).rows[0].code;
      await split.notify(
        c,
        u.rows[0]?.id,
        'SPLIT_REQUEST',
        `Đóng ${split.vnd(s.amount)} tiền trận ${code}`,
        `Đội trưởng chuyển phần đóng tiền cho bạn (nội dung QUY ${code} ${req.body.phone}).`,
        s.booking_id
      );
      return r.rows[0];
    });
    res.status(201).json(out);
  } catch (err) {
    if (err.code === '23505') return next(new AppError('INVALID_FIELD', { message: 'SĐT này đã có trong danh sách chia tiền' }));
    next(err);
  }
});

module.exports = router;
