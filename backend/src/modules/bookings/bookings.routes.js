'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const router = express.Router();

const HOLD_MINUTES = Number(process.env.HOLD_MINUTES || 15);

function makeCode() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK${ymd}${rnd}`;
}

// POST /api/bookings
// body: { field_id, play_date, start, end, user_id? , guest_name?, guest_phone?, note? }
router.post('/', async (req, res, next) => {
  const { field_id, play_date, start, end, user_id, guest_name, guest_phone, note } = req.body || {};

  try {
    // Rang buoc ck_booking_owner: don bat buoc co user_id.
    // guest_name/guest_phone chi la thong tin lien he them (vd. nhan vien dat ho).
    requireFields(req.body, ['field_id', 'play_date', 'start', 'end', 'user_id']);

    const out = await withTransaction(async (c) => {
      // 1. Lay san + loai san + venue
      const f = await c.query(
        `SELECT f.id, f.type, f.venue_id, v.deposit_rate, v.status AS venue_status
           FROM field f JOIN venue v ON v.id = f.venue_id
          WHERE f.id = $1 AND f.is_active`, [field_id]);
      if (f.rowCount === 0) throw new AppError('FIELD_NOT_FOUND', { details: { field_id } });
      const field = f.rows[0];
      if (field.venue_status !== 'APPROVED') {
        throw new AppError('VENUE_NOT_APPROVED', { details: { venue_id: field.venue_id } });
      }

      // 2. Tinh gia theo price_rule (base_price * multiplier * so gio)
      const p = await c.query(
        `WITH span AS (
           SELECT ($1 || ' ' || $2)::timestamptz AS s, ($1 || ' ' || $3)::timestamptz AS e
         ), meta AS (
           SELECT s, e,
                  extract(epoch FROM (e - s)) / 3600.0 AS hours,
                  CASE WHEN extract(isodow FROM s) >= 6 THEN 'WEEKEND' ELSE 'WEEKDAY' END::day_type AS dtype,
                  (extract(hour FROM s) * 60 + extract(minute FROM s))::int AS start_min
             FROM span
         )
         SELECT m.hours, m.dtype, pr.id AS price_rule_id,
                round(pr.base_price * pr.multiplier * m.hours) AS amount
           FROM meta m
           LEFT JOIN price_rule pr
                  ON pr.venue_id = $4 AND pr.field_type = $5
                 AND pr.day_type = m.dtype AND pr.time_span @> m.start_min`,
        [play_date, start, end, field.venue_id, field.type]);

      const price = p.rows[0];
      if (!price || price.amount === null) {
        throw new AppError('NO_PRICE_RULE', { details: { play_date, start, end, field_type: field.type } });
      }
      const total = Number(price.amount);
      const deposit = Math.round(total * Number(field.deposit_rate));

      // 3. Tao don o trang thai HELD
      const b = await c.query(
        `INSERT INTO booking (code, kind, status, venue_id, user_id,
                              total_amount, deposit_amount,
                              guest_name, guest_phone, note, hold_expires_at)
         VALUES ($1, 'SINGLE', 'HELD', $2, $3, $4, $5, $6, $7, $8, now() + ($9 || ' minutes')::interval)
         RETURNING *`,
        [makeCode(), field.venue_id, user_id || null, total, deposit,
         guest_name || null, guest_phone || null, note || null, HOLD_MINUTES]);
      const booking = b.rows[0];

      // 4. Giu khung gio - rang buoc EXCLUDE se chan neu trung
      const s = await c.query(
        `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
         VALUES ($1, $2, $3::date,
                 tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'),
                 $6, 'HELD')
         RETURNING id, play_date, lower(time_range) AS start_at, upper(time_range) AS end_at, price, status`,
        [booking.id, field_id, play_date, start, end, total]);

      return { ...booking, slots: s.rows, price_rule_id: price.price_rule_id, hours: Number(price.hours) };
    });

    res.status(201).json(out);
  } catch (err) {
    // Ma loi PostgreSQL (23P01 trung khung gio, 23514 vi pham check...)
    // duoc errorHandler quy doi sang ma loi cua he thong.
    next(err);
  }
});

// GET /api/bookings/:code
router.get('/:code', async (req, res, next) => {
  try {
    const b = await query(
      `SELECT b.*, v.name AS venue_name
         FROM booking b JOIN venue v ON v.id = b.venue_id
        WHERE b.code = $1`, [req.params.code]);
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.params.code } });

    const slots = await query(
      `SELECT bs.id, f.name AS field_name, bs.play_date,
              lower(bs.time_range) AS start_at, upper(bs.time_range) AS end_at,
              bs.price, bs.status
         FROM booking_slot bs JOIN field f ON f.id = bs.field_id
        WHERE bs.booking_id = $1 ORDER BY bs.play_date, lower(bs.time_range)`, [b.rows[0].id]);
    const pays = await query(
      `SELECT id, method, status, amount, provider_ref, paid_at
         FROM payment WHERE booking_id = $1 ORDER BY created_at`, [b.rows[0].id]);

    res.json({ ...b.rows[0], slots: slots.rows, payments: pays.rows });
  } catch (e) { next(e); }
});

// POST /api/bookings/:code/cancel  body: { reason? }
router.post('/:code/cancel', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await c.query(
        `SELECT id, status FROM booking WHERE code = $1 FOR UPDATE`, [req.params.code]);
      if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.params.code } });
      if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.rows[0].status)) {
        throw new AppError('INVALID_STATUS', {
          message: `Don dang o trang thai ${b.rows[0].status}, khong the huy`,
          details: { status: b.rows[0].status, allowed: ['HELD', 'PENDING_VERIFY', 'CONFIRMED'] },
        });
      }
      const id = b.rows[0].id;
      await c.query(
        `UPDATE booking SET status = 'CANCELLED_BY_USER', cancelled_at = now(),
                            cancel_reason = $2, hold_expires_at = NULL
          WHERE id = $1`, [id, (req.body && req.body.reason) || 'Nguoi dung huy']);
      const s = await c.query(
        `UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1 RETURNING id`, [id]);
      return { code: req.params.code, status: 'CANCELLED_BY_USER', released_slots: s.rowCount };
    });
    res.json(out);
  } catch (err) { next(err); }
});

// POST /api/bookings/release-expired  -> goi ham don don qua han
router.post('/maintenance/release-expired', async (req, res, next) => {
  try {
    const r = await query(`SELECT fn_release_expired_holds() AS released`);
    res.json({ released: r.rows[0].released });
  } catch (e) { next(e); }
});

module.exports = router;
