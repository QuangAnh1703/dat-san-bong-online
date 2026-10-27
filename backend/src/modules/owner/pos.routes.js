'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { takeStock } = require('../../services/inventory.service');

// POS can-tin & kho dich vu cua chu san (PRD 2.2.5)
const router = express.Router();
router.use(requireAuthenticated, requireRole('OWNER', 'ADMIN'));

const CATEGORIES = ['DRINK', 'RENTAL', 'BALL', 'REFEREE', 'OTHER'];
const PAY_MODES = ['CASH', 'QR', 'ADD_TO_BOOKING'];

async function assertVenueAccess(c, venueId, user) {
  const v = await c.query(`SELECT id, owner_id FROM venue WHERE id = $1`, [venueId]);
  if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
  if (user.role !== 'ADMIN' && v.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
}

function parseService(body, partial) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name || name.length > 120) throw new AppError('INVALID_FIELD', { details: { field: 'name' } });
    out.name = name;
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new AppError('INVALID_FIELD', { details: { field: 'price' } });
    out.price = Math.round(price);
  }
  if (!partial || body.category !== undefined) {
    const category = body.category || 'OTHER';
    if (!CATEGORIES.includes(category)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'category', allowed: CATEGORIES } });
    }
    out.category = category;
  }
  if (!partial || body.stock !== undefined) {
    const stock = body.stock === null || body.stock === '' || body.stock === undefined ? null : Number(body.stock);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'stock' } });
    }
    out.stock = stock;
  }
  if (body.is_active !== undefined) out.is_active = Boolean(body.is_active);
  return out;
}

// GET /api/owner/venues/:id/services - menu + ton kho (ca mon da an)
router.get('/venues/:id/services', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenueAccess({ query }, venueId, req.user);
    const r = await query(
      `SELECT id, name, price, category, stock, is_active FROM venue_service
        WHERE venue_id = $1 ORDER BY is_active DESC, category, name`,
      [venueId]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/venues/:id/services  body: { name, price, category, stock|null }
router.post('/venues/:id/services', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenueAccess({ query }, venueId, req.user);
    const s = parseService(req.body || {}, false);
    const r = await query(
      `INSERT INTO venue_service (venue_id, name, price, category, stock, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
       RETURNING id, name, price, category, stock, is_active`,
      [venueId, s.name, s.price, s.category, s.stock, s.is_active ?? null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/services/:id  body: { name?, price?, category?, stock?, is_active? }
router.put('/services/:id', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const cur = await c.query(`SELECT * FROM venue_service WHERE id = $1 FOR UPDATE`, [Number(req.params.id)]);
      if (cur.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy mặt hàng' });
      await assertVenueAccess(c, cur.rows[0].venue_id, req.user);
      const s = { ...cur.rows[0], ...parseService(req.body || {}, true) };
      const r = await c.query(
        `UPDATE venue_service SET name = $2, price = $3, category = $4, stock = $5, is_active = $6
          WHERE id = $1 RETURNING id, name, price, category, stock, is_active`,
        [cur.rows[0].id, s.name, s.price, s.category, s.stock, s.is_active]
      );
      return r.rows[0];
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/venues/:id/pos?date=YYYY-MM-DD - o san trong ngay + menu + don quay trong ngay
router.get('/venues/:id/pos', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await assertVenueAccess({ query }, venueId, req.user);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? req.query.date : null;
    const [bookings, services, orders] = await Promise.all([
      query(
        `SELECT b.code, b.kind, b.status, b.checked_out_at, f.name AS field_name,
                lower(s.time_range) AS start_at, upper(s.time_range) AS end_at,
                COALESCE(p.full_name, b.guest_name) AS customer_name
           FROM booking b
           JOIN booking_slot s ON s.booking_id = b.id AND s.status IN ('CONFIRMED', 'LOCKED')
           JOIN field f ON f.id = s.field_id
           LEFT JOIN user_profile p ON p.user_id = b.user_id
          WHERE b.venue_id = $1 AND s.play_date = COALESCE($2::date, current_date)
            AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
            AND (b.kind <> 'OWNER_LOCK' OR b.lock_reason = 'WALK_IN')
          ORDER BY lower(s.time_range), f.name`,
        [venueId, date]
      ),
      query(
        `SELECT id, name, price, category, stock FROM venue_service
          WHERE venue_id = $1 AND is_active ORDER BY category, name`,
        [venueId]
      ),
      query(
        `SELECT o.id, o.pay_mode, o.total, o.paid_at, o.created_at, b.code AS booking_code,
                (SELECT json_agg(json_build_object('name', i.name, 'quantity', i.quantity, 'price', i.price))
                   FROM service_order_item i WHERE i.order_id = o.id) AS items
           FROM service_order o LEFT JOIN booking b ON b.id = o.booking_id
          WHERE o.venue_id = $1 AND o.created_at::date = COALESCE($2::date, current_date)
          ORDER BY o.created_at DESC`,
        [venueId, date]
      ),
    ]);
    res.json({ bookings: bookings.rows, services: services.rows, orders: orders.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/venues/:id/pos-orders  body: { items: [{ service_id, quantity }], pay_mode, booking_code? }
router.post('/venues/:id/pos-orders', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { items, pay_mode, booking_code } = req.body || {};
    requireFields(req.body, ['items', 'pay_mode']);
    if (!Array.isArray(items) || items.length === 0) throw new AppError('INVALID_FIELD', { details: { field: 'items' } });
    if (!PAY_MODES.includes(pay_mode)) throw new AppError('INVALID_FIELD', { details: { field: 'pay_mode', allowed: PAY_MODES } });
    if (pay_mode === 'ADD_TO_BOOKING' && !booking_code) throw new AppError('MISSING_FIELD', { details: { missing: ['booking_code'] } });

    const out = await withTransaction(async (c) => {
      await assertVenueAccess(c, venueId, req.user);
      let bookingId = null;
      if (booking_code) {
        const b = await c.query(`SELECT id, venue_id, status, checked_out_at FROM booking WHERE code = $1 FOR UPDATE`, [
          booking_code,
        ]);
        if (b.rowCount === 0 || Number(b.rows[0].venue_id) !== venueId) throw new AppError('BOOKING_NOT_FOUND');
        if (pay_mode === 'ADD_TO_BOOKING' && b.rows[0].checked_out_at) {
          throw new AppError('INVALID_STATUS', { message: 'Đơn đã check-out, hãy thanh toán ngay' });
        }
        bookingId = b.rows[0].id;
      }
      const taken = await takeStock(c, venueId, items);
      const total = taken.reduce((s, x) => s + Number(x.price) * x.quantity, 0);
      const o = await c.query(
        `INSERT INTO service_order (venue_id, booking_id, created_by, pay_mode, total, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, pay_mode, total, paid_at, created_at`,
        [venueId, bookingId, req.user.id, pay_mode, total, pay_mode === 'ADD_TO_BOOKING' ? null : new Date()]
      );
      for (const t of taken) {
        await c.query(
          `INSERT INTO service_order_item (order_id, service_id, name, category, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (order_id, service_id) DO UPDATE SET quantity = service_order_item.quantity + EXCLUDED.quantity`,
          [o.rows[0].id, t.id, t.name, t.category, t.price, t.quantity]
        );
      }
      return { ...o.rows[0], booking_code: booking_code || null, items: taken };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

async function checkoutSummary(c, bookingId) {
  const items = await c.query(
    `SELECT 'ONLINE' AS source, bs.service_id, bs.name, COALESCE(vs.category, 'OTHER') AS category,
            bs.price, bs.quantity, TRUE AS paid_with_booking
       FROM booking_service bs LEFT JOIN venue_service vs ON vs.id = bs.service_id
      WHERE bs.booking_id = $1
     UNION ALL
     SELECT 'POS', i.service_id, i.name, i.category, i.price, i.quantity, o.paid_at IS NOT NULL
       FROM service_order o JOIN service_order_item i ON i.order_id = o.id
      WHERE o.booking_id = $1`,
    [bookingId]
  );
  const b = await c.query(
    `SELECT b.total_amount,
            (SELECT COALESCE(sum(amount), 0) FROM payment WHERE booking_id = b.id AND status = 'SUCCESS') AS paid
       FROM booking b WHERE b.id = $1`,
    [bookingId]
  );
  const unpaidPos = items.rows
    .filter((x) => x.source === 'POS' && !x.paid_with_booking)
    .reduce((s, x) => s + Number(x.price) * x.quantity, 0);
  const fieldRemaining = Math.max(0, Number(b.rows[0].total_amount) - Number(b.rows[0].paid));
  return {
    items: items.rows,
    rentals: items.rows.filter((x) => x.category === 'RENTAL'),
    field_remaining: fieldRemaining,
    unpaid_services: unpaidPos,
    amount_due: fieldRemaining + unpaidPos,
  };
}

async function lockBooking(c, code, user) {
  const b = await c.query(
    `SELECT b.*, v.owner_id FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.code = $1 FOR UPDATE OF b`,
    [code]
  );
  if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code } });
  if (user.role !== 'ADMIN' && b.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
  return b.rows[0];
}

// GET /api/owner/bookings/:code/checkout - tong tien con thu, do cho thue can kiem
router.get('/bookings/:code/checkout', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await lockBooking(c, req.params.code, req.user);
      return { code: b.code, checked_out_at: b.checked_out_at, ...(await checkoutSummary(c, b.id)) };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/bookings/:code/checkout  body: { rentals_returned: boolean, missing_note? }
// PRD 2.2.5.2: don co do cho thue thi bat buoc xac nhan da kiem do truoc khi chot thu tien
router.post('/bookings/:code/checkout', async (req, res, next) => {
  try {
    const { rentals_returned, missing_note } = req.body || {};
    const out = await withTransaction(async (c) => {
      const b = await lockBooking(c, req.params.code, req.user);
      if (b.checked_out_at) throw new AppError('INVALID_STATUS', { message: 'Đơn đã check-out' });
      if (!['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status)) {
        throw new AppError('INVALID_STATUS', { details: { status: b.status } });
      }
      const summary = await checkoutSummary(c, b.id);
      if (summary.rentals.length > 0 && typeof rentals_returned !== 'boolean') {
        throw new AppError('RENTAL_CHECK_REQUIRED', { details: { rentals: summary.rentals } });
      }
      if (rentals_returned === false && !String(missing_note || '').trim()) {
        throw new AppError('MISSING_FIELD', { message: 'Ghi rõ đồ thuê bị thiếu', details: { missing: ['missing_note'] } });
      }
      // Do thue tra du -> hoan lai kho
      if (rentals_returned === true) {
        for (const r of summary.rentals) {
          await c.query(`UPDATE venue_service SET stock = stock + $2 WHERE id = $1 AND stock IS NOT NULL`, [
            r.service_id,
            r.quantity,
          ]);
        }
      }
      await c.query(`UPDATE service_order SET paid_at = now() WHERE booking_id = $1 AND paid_at IS NULL`, [b.id]);
      await c.query(`UPDATE booking SET checked_out_at = now(), rentals_missing = $2 WHERE id = $1`, [
        b.id,
        rentals_returned === false ? String(missing_note).slice(0, 300) : null,
      ]);
      return { code: b.code, checked_out: true, amount_collected: summary.amount_due };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
