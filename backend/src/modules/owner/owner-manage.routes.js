'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { quoteSlot } = require('../../services/pricing.service');
const { MAX_DIRECT_DAYS, parseRange, periodRange, buildReport } = require('../../services/report.service');

// Cac chuc nang van hanh cua chu san (WF-10/11): don dat, khoa slot, flash sale
const router = express.Router();
router.use(requireAuthenticated, requireRole('OWNER', 'ADMIN'));

const LOCK_REASONS = ['WALK_IN', 'MAINTENANCE', 'OTHER'];

function makeCode(prefix) {
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}${ymd}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// Chu san chi thao tac tren san cua minh; admin thao tac duoc moi san
async function assertVenueAccess(c, venueId, user) {
  const v = await c.query(`SELECT id, owner_id FROM venue WHERE id = $1`, [venueId]);
  if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
  if (user.role !== 'ADMIN' && v.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
  return v.rows[0];
}

async function lockBookingForOwner(c, code, user) {
  const b = await c.query(
    `SELECT b.*, v.owner_id FROM booking b JOIN venue v ON v.id = b.venue_id
      WHERE b.code = $1 FOR UPDATE OF b`,
    [code]
  );
  if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code } });
  if (user.role !== 'ADMIN' && b.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
  return b.rows[0];
}

// GET /api/owner/venues - Cum san cua chu san (moi trang thai)
router.get('/venues', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT v.id, v.name, v.address, v.status, v.district_code, d.name AS district_name, v.phone,
              v.latitude, v.longitude, v.description, v.open_time, v.close_time, v.deposit_rate,
              v.bank_name, v.bank_account, v.bank_holder, v.created_at, v.updated_at,
              COALESCE((SELECT json_agg(json_build_object('id', f.id, 'name', f.name, 'type', f.type,
                                                          'is_active', f.is_active) ORDER BY f.name)
                          FROM field f WHERE f.venue_id = v.id), '[]') AS fields,
              COALESCE((SELECT array_agg(va.amenity_code) FROM venue_amenity va WHERE va.venue_id = v.id), '{}')
                AS amenities,
              (SELECT va.reason FROM venue_approval va
                WHERE va.venue_id = v.id AND va.action = 'REJECT'
                ORDER BY va.created_at DESC LIMIT 1) AS reject_reason
         FROM venue v JOIN district d ON d.code = v.district_code
        WHERE $1::bigint IS NULL OR v.owner_id = $1
        ORDER BY v.created_at`,
      [req.user.role === 'ADMIN' ? null : req.user.id]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/reports?venue_id=&period=day|week|month  (hoac &from=&to=)
// Bao cao chu san (PRD 2.4): luot dat, doanh thu, tien coc, ty le lap day theo khung gio
router.get('/reports', async (req, res, next) => {
  try {
    const venueId = Number(req.query.venue_id);
    if (!venueId) throw new AppError('MISSING_FIELD', { details: { missing: ['venue_id'] } });
    await assertVenueAccess({ query }, venueId, req.user);
    let range;
    if (req.query.from || req.query.to) range = parseRange(req.query);
    else {
      const period = req.query.period || 'month';
      if (!['day', 'week', 'month'].includes(period)) {
        throw new AppError('INVALID_FIELD', { details: { field: 'period', reason: 'day | week | month' } });
      }
      range = periodRange(period);
    }
    if (range.days > MAX_DIRECT_DAYS) {
      throw new AppError('INVALID_TIME_RANGE', { details: { max_days: MAX_DIRECT_DAYS } });
    }
    res.json(await buildReport({ query }, { ...range, venueId }));
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/bookings?venue_id=&status=
router.get('/bookings', async (req, res, next) => {
  try {
    const venueId = Number(req.query.venue_id);
    if (!venueId) throw new AppError('MISSING_FIELD', { details: { missing: ['venue_id'] } });
    await assertVenueAccess({ query }, venueId, req.user);

    const params = [venueId];
    let where = `b.venue_id = $1 AND b.kind <> 'OWNER_LOCK'`;
    if (req.query.status) {
      params.push(String(req.query.status).split(','));
      where += ` AND b.status::text = ANY($${params.length})`;
    }

    const r = await query(
      `SELECT b.id, b.code, b.kind, b.status, b.total_amount, b.deposit_amount, b.discount_amount,
              b.guest_name, b.guest_phone, b.note, b.hold_expires_at, b.created_at, b.checked_out_at,
              COALESCE(p.full_name, b.guest_name) AS customer_name,
              COALESCE(b.guest_phone, u.phone) AS customer_phone,
              t.name AS team_name,
              (SELECT COALESCE(sum(bt.amount), 0) FROM bank_transaction bt
                WHERE bt.booking_id = b.id AND bt.status IN ('PARTIAL', 'APPLIED'))
                + (SELECT COALESCE(sum(pw.amount), 0) FROM payment pw
                    WHERE pw.booking_id = b.id AND pw.method = 'WALLET' AND pw.status = 'SUCCESS') AS amount_received,
              (SELECT json_agg(json_build_object(
                        'field_name', f.name, 'play_date', s.play_date,
                        'start_at', lower(s.time_range), 'end_at', upper(s.time_range), 'status', s.status)
                        ORDER BY lower(s.time_range))
                 FROM booking_slot s JOIN field f ON f.id = s.field_id WHERE s.booking_id = b.id) AS slots,
              (SELECT json_agg(json_build_object('name', bs.name, 'price', bs.price, 'quantity', bs.quantity))
                 FROM booking_service bs WHERE bs.booking_id = b.id) AS services,
              (SELECT json_build_object('status', pm.status, 'amount', pm.amount,
                                        'bill_image_url', pm.bill_image_url, 'created_at', pm.created_at)
                 FROM payment pm WHERE pm.booking_id = b.id ORDER BY pm.created_at DESC LIMIT 1) AS payment
         FROM booking b
         LEFT JOIN app_user u ON u.id = b.user_id
         LEFT JOIN user_profile p ON p.user_id = b.user_id
         LEFT JOIN team t ON t.id = b.team_id
        WHERE ${where}
        ORDER BY b.created_at DESC
        LIMIT 100`,
      params
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/bookings/:code/confirm - Xac nhan da nhan coc
router.post('/bookings/:code/confirm', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await lockBookingForOwner(c, req.params.code, req.user);
      if (!['HELD', 'PENDING_VERIFY'].includes(b.status)) {
        throw new AppError('INVALID_STATUS', {
          details: { status: b.status, allowed: ['HELD', 'PENDING_VERIFY'] },
        });
      }
      await c.query(
        `UPDATE booking SET status = 'CONFIRMED', confirmed_at = now(), hold_expires_at = NULL WHERE id = $1`,
        [b.id]
      );
      await c.query(
        `UPDATE booking_slot SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`,
        [b.id]
      );
      await c.query(
        `UPDATE payment SET status = 'SUCCESS', paid_at = now(), verified_by = $2, verified_at = now()
          WHERE booking_id = $1 AND status = 'PENDING'`,
        [b.id, req.user.id]
      );
      return { code: b.code, status: 'CONFIRMED' };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/bookings/:code/reject  body: { reason }
router.post('/bookings/:code/reject', async (req, res, next) => {
  try {
    requireFields(req.body, ['reason']);
    const out = await withTransaction(async (c) => {
      const b = await lockBookingForOwner(c, req.params.code, req.user);
      if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.status)) {
        throw new AppError('INVALID_STATUS', { details: { status: b.status } });
      }
      await c.query(
        `UPDATE booking SET status = 'CANCELLED_BY_OWNER', cancelled_at = now(), cancel_reason = $2,
                            hold_expires_at = NULL
          WHERE id = $1`,
        [b.id, String(req.body.reason).slice(0, 300)]
      );
      await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [b.id]);
      await c.query(`UPDATE payment SET status = 'CANCELLED' WHERE booking_id = $1 AND status = 'PENDING'`, [
        b.id,
      ]);
      await c.query(
        `UPDATE match_post SET status = 'CLOSED', closed_at = now() WHERE booking_id = $1 AND status = 'OPEN'`,
        [b.id]
      );
      return { code: b.code, status: 'CANCELLED_BY_OWNER' };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/locks - Khoa slot (bao tri) hoac tao don khach goi dien / tai quay (UC-22)
// body: { field_id, play_date, start, end, reason: WALK_IN|MAINTENANCE|OTHER, guest_name?, guest_phone?, note? }
router.post('/locks', async (req, res, next) => {
  const { field_id, play_date, start, end, reason, guest_name, guest_phone, note } = req.body || {};
  try {
    requireFields(req.body, ['field_id', 'play_date', 'start', 'end', 'reason']);
    if (!LOCK_REASONS.includes(reason)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'reason', reason: LOCK_REASONS.join(', ') } });
    }
    if (reason === 'WALK_IN' && !guest_name) {
      throw new AppError('MISSING_FIELD', { details: { missing: ['guest_name'] } });
    }

    const out = await withTransaction(async (c) => {
      const f = await c.query(`SELECT id, type, venue_id FROM field WHERE id = $1 AND is_active`, [field_id]);
      if (f.rowCount === 0) throw new AppError('FIELD_NOT_FOUND', { details: { field_id } });
      const field = f.rows[0];
      await assertVenueAccess(c, field.venue_id, req.user);

      // Khach tai quay tra du tien san; khoa bao tri thi khong tinh tien
      const price =
        reason === 'WALK_IN'
          ? (
              await quoteSlot(c, {
                venueId: field.venue_id,
                fieldType: field.type,
                playDate: play_date,
                start,
                end,
              })
            ).amount
          : 0;

      const b = await c.query(
        `INSERT INTO booking (code, kind, status, venue_id, total_amount, deposit_amount,
                              guest_name, guest_phone, lock_reason, note, confirmed_at)
         VALUES ($1, 'OWNER_LOCK', 'CONFIRMED', $2, $3, $3, $4, $5, $6, $7, now())
         RETURNING id, code, kind, status, total_amount, guest_name, guest_phone, lock_reason, note`,
        [makeCode('LK'), field.venue_id, price, guest_name || null, guest_phone || null, reason, note || null]
      );

      const s = await c.query(
        `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
         VALUES ($1, $2, $3::date,
                 tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'), $6, 'LOCKED')
         RETURNING id, play_date, lower(time_range) AS start_at, upper(time_range) AS end_at, status`,
        [b.rows[0].id, field_id, play_date, start, end, price]
      );

      return { ...b.rows[0], slots: s.rows };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/owner/locks/:code - Mo lai slot da khoa
router.delete('/locks/:code', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await lockBookingForOwner(c, req.params.code, req.user);
      if (b.kind !== 'OWNER_LOCK')
        throw new AppError('INVALID_OPERATION', { message: 'Khong phai don khoa slot' });
      await c.query(
        `UPDATE booking SET status = 'CANCELLED_BY_OWNER', cancelled_at = now(), cancel_reason = 'Mo lai slot'
          WHERE id = $1`,
        [b.id]
      );
      await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [b.id]);
      return { code: b.code, status: 'CANCELLED_BY_OWNER' };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

const FLASH_COLUMNS = `id, discount_percent, trigger_hours_before, is_active, floor_price`;

// GET /api/owner/venues/:id/flash-sale
router.get('/venues/:id/flash-sale', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenueAccess({ query }, venueId, req.user);
    const r = await query(
      `SELECT ${FLASH_COLUMNS} FROM promotion WHERE venue_id = $1 AND type = 'FLASH_SALE'
        ORDER BY created_at DESC LIMIT 1`,
      [venueId]
    );
    res.json({ flash_sale: r.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/venues/:id/flash-sale  body: { is_active, discount_percent, trigger_hours_before }
router.put('/venues/:id/flash-sale', async (req, res, next) => {
  const { is_active = true, discount_percent, trigger_hours_before } = req.body || {};
  try {
    requireFields(req.body, ['discount_percent', 'trigger_hours_before']);
    if (!Number.isInteger(discount_percent) || discount_percent < 1 || discount_percent > 90) {
      throw new AppError('INVALID_FIELD', { details: { field: 'discount_percent', reason: '1-90' } });
    }
    if (!Number.isInteger(trigger_hours_before) || trigger_hours_before < 1 || trigger_hours_before > 48) {
      throw new AppError('INVALID_FIELD', { details: { field: 'trigger_hours_before', reason: '1-48' } });
    }
    const venueId = Number(req.params.id);

    const flash = await withTransaction(async (c) => {
      await assertVenueAccess(c, venueId, req.user);
      const existing = await c.query(
        `SELECT id FROM promotion WHERE venue_id = $1 AND type = 'FLASH_SALE'
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [venueId]
      );
      if (existing.rowCount) {
        const r = await c.query(
          `UPDATE promotion SET is_active = $2, discount_percent = $3, trigger_hours_before = $4
            WHERE id = $1 RETURNING ${FLASH_COLUMNS}`,
          [existing.rows[0].id, !!is_active, discount_percent, trigger_hours_before]
        );
        return r.rows[0];
      }
      const r = await c.query(
        `INSERT INTO promotion (venue_id, type, name, discount_percent, trigger_hours_before, is_active)
         VALUES ($1, 'FLASH_SALE', 'Flash Sale giờ vắng', $2, $3, $4) RETURNING ${FLASH_COLUMNS}`,
        [venueId, discount_percent, trigger_hours_before, !!is_active]
      );
      return r.rows[0];
    });
    res.json({ flash_sale: flash });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
