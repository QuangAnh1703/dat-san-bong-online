'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { quoteSlot } = require('../../services/pricing.service');
const { takeStock } = require('../../services/inventory.service');
const router = express.Router();

const HOLD_MINUTES = Number(process.env.HOLD_MINUTES || 15);

// Chiet khau hop dong dinh ky mac dinh khi chu san chua cau hinh CONTRACT_DISCOUNT
const DEFAULT_CONTRACT_DISCOUNT = [
  { minMonths: 3, percent: 15 },
  { minMonths: 1, percent: 10 },
];

// Chu san da cau hinh CONTRACT_DISCOUNT thi chi theo cau hinh do (chua du so thang -> 0%)
function contractDiscount(promos, months) {
  if (promos.length === 0) return DEFAULT_CONTRACT_DISCOUNT.find((x) => months >= x.minMonths).percent;
  const ok = promos.filter((p) => p.min_contract_months === null || p.min_contract_months <= months);
  return ok.length ? Math.max(...ok.map((p) => p.discount_percent)) : 0;
}

function makeCode() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK${ymd}${rnd}`;
}

const toMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

async function loadSlots(bookingId) {
  const r = await query(
    `SELECT bs.id, bs.field_id, f.name AS field_name, bs.play_date,
            lower(bs.time_range) AS start_at, upper(bs.time_range) AS end_at,
            bs.price, bs.status
       FROM booking_slot bs JOIN field f ON f.id = bs.field_id
      WHERE bs.booking_id = $1 ORDER BY bs.play_date, lower(bs.time_range)`,
    [bookingId]
  );
  return r.rows;
}

async function loadServices(bookingId) {
  const r = await query(
    `SELECT service_id, name, price, quantity FROM booking_service WHERE booking_id = $1 ORDER BY name`,
    [bookingId]
  );
  return r.rows;
}

async function loadField(c, fieldId) {
  const f = await c.query(
    `SELECT f.id, f.type, f.venue_id, v.deposit_rate, v.status AS venue_status, v.district_code
       FROM field f JOIN venue v ON v.id = f.venue_id
      WHERE f.id = $1 AND f.is_active`,
    [fieldId]
  );
  if (f.rowCount === 0) throw new AppError('FIELD_NOT_FOUND', { details: { field_id: fieldId } });
  const field = f.rows[0];
  if (field.venue_status !== 'APPROVED') {
    throw new AppError('VENUE_NOT_APPROVED', { details: { venue_id: field.venue_id } });
  }
  return field;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Gio bat dau phai con o tuong lai: UI da disable slot qua han, nhung van chan neu goi thang API
async function assertSlotTimes(c, playDate, start, end) {
  if (!DATE_RE.test(String(playDate))) throw new AppError('INVALID_FIELD', { details: { field: 'play_date' } });
  if (!TIME_RE.test(String(start)) || !TIME_RE.test(String(end)) || toMinutes(end) <= toMinutes(start)) {
    throw new AppError('INVALID_TIME_RANGE', { details: { start, end } });
  }
  const r = await c.query(`SELECT ($1 || ' ' || $2)::timestamptz <= now() AS past`, [playDate, start]);
  if (r.rows[0].past) throw new AppError('SLOT_IN_PAST', { details: { play_date: playDate, start } });
}

async function insertSlot(c, { bookingId, fieldId, playDate, start, end, price, status, quote }) {
  const s = await c.query(
    `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
     VALUES ($1, $2, $3::date,
             tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'),
             $6, $7)
     RETURNING id, play_date, lower(time_range) AS start_at, upper(time_range) AS end_at, price, status`,
    [bookingId, fieldId, playDate, start, end, price, status]
  );
  if (quote) {
    await c.query(
      `INSERT INTO price_history (booking_slot_id, price_rule_id, promotion_id, base_price,
                                  discount_amount, final_price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.rows[0].id, quote.priceRuleId, quote.promotionId, quote.baseAmount, quote.baseAmount - price, price]
    );
  }
  return s.rows[0];
}

// GET /api/bookings - Lay danh sach booking cua user hien tai
router.get('/', requireAuthenticated, async (req, res, next) => {
  try {
    // Chi admin duoc xem don cua nguoi khac (ket qua co SDT)
    const userId = req.user.role === 'ADMIN' && req.query.user_id ? Number(req.query.user_id) : req.user.id;

    // Gom ca tran minh duoc chap nhan qua cap keo / ghep chan le (match_participant), khong chi don minh dat
    const result = await query(
      `SELECT b.*, v.name AS venue_name, t.name AS team_name,
              rc.weekdays, rc.start_date, rc.end_date, rc.sessions_total, rc.discount_percent AS contract_discount,
              EXISTS (SELECT 1 FROM complaint_ticket ct WHERE ct.booking_id = b.id) AS has_complaint,
              (SELECT c.id FROM conversation c JOIN conversation_member cm ON cm.conversation_id = c.id
                WHERE c.booking_id = b.id AND cm.user_id = $1) AS conversation_id,
              (b.user_id IS DISTINCT FROM $1) AS is_participant,
              COALESCE(hp.full_name, b.guest_name) AS host_name,
              v.address AS venue_address,
              CASE WHEN b.user_id IS DISTINCT FROM $1 THEN COALESCE(hu.phone, b.guest_phone) END AS host_phone,
              EXISTS (SELECT 1 FROM match_post rp WHERE rp.booking_id = b.id
                         AND rp.type = 'TEAM_FINDS_PLAYER' AND rp.status = 'OPEN') AS has_open_recruit,
              r.pitch_rating, r.service_rating, r.comment AS review_comment, r.owner_reply AS review_reply
         FROM booking b
         JOIN venue v ON v.id = b.venue_id
         LEFT JOIN team t ON t.id = b.team_id
         LEFT JOIN review r ON r.booking_id = b.id
         LEFT JOIN recurring_contract rc ON rc.booking_id = b.id
         LEFT JOIN user_profile hp ON hp.user_id = b.user_id
         LEFT JOIN app_user hu ON hu.id = b.user_id
        WHERE b.user_id = $1
           OR EXISTS (SELECT 1 FROM match_participant mp
                       WHERE mp.booking_id = b.id AND mp.user_id = $1 AND mp.cancelled_at IS NULL)
        ORDER BY b.created_at DESC
        LIMIT 100`,
      [userId]
    );

    const bookings = await Promise.all(
      result.rows.map(async (b) => ({
        ...b,
        slots: await loadSlots(b.id),
        services: await loadServices(b.id),
      }))
    );

    res.json({ count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
// body: { field_id, play_date, start, end, guest_name?, guest_phone?, note?,
//         service_ids? | services?: [{ id, quantity }], pay_full?, looking_for_rival?, deal_note? }
router.post('/', requireAuthenticated, async (req, res, next) => {
  const {
    field_id,
    play_date,
    start,
    end,
    guest_name,
    guest_phone,
    note,
    service_ids = [],
    services: serviceItems,
    pay_full = false,
    looking_for_rival = false,
    deal_note,
  } = req.body || {};
  const userId = req.user.id;

  try {
    requireFields(req.body, ['field_id', 'play_date', 'start', 'end']);
    if (!Array.isArray(service_ids) || (serviceItems !== undefined && !Array.isArray(serviceItems))) {
      throw new AppError('INVALID_FIELD', { details: { field: 'service_ids', reason: 'Must be array' } });
    }

    const out = await withTransaction(async (c) => {
      await assertSlotTimes(c, play_date, start, end);
      const field = await loadField(c, field_id);
      const quote = await quoteSlot(c, {
        venueId: field.venue_id,
        fieldType: field.type,
        playDate: play_date,
        start,
        end,
      });

      // Dich vu cong them: lay gia tu CSDL, khong tin gia client gui len; tru kho ngay (PRD 2.2.5)
      const wanted = serviceItems || service_ids.map((id) => ({ id, quantity: 1 }));
      const services = await takeStock(c, field.venue_id, wanted);
      const servicesTotal = services.reduce((s, x) => s + Number(x.price) * x.quantity, 0);

      let team = null;
      if (looking_for_rival) {
        // PRD 1.5: phai con it nhat 30 phut truoc gio da moi tim doi giao huu
        const soon = await c.query(`SELECT ($1 || ' ' || $2)::timestamptz < now() + interval '30 minutes' AS soon`, [
          play_date,
          start,
        ]);
        if (soon.rows[0].soon) throw new AppError('MATCH_TOO_SOON');
        const t = await c.query(`SELECT id, skill_level FROM team WHERE captain_id = $1`, [userId]);
        if (t.rowCount === 0) throw new AppError('TEAM_REQUIRED');
        team = t.rows[0];
      }

      const total = quote.amount + servicesTotal;
      const deposit = pay_full ? total : Math.round(total * Number(field.deposit_rate));

      const b = await c.query(
        `INSERT INTO booking (code, kind, status, venue_id, user_id, team_id,
                              total_amount, deposit_amount, discount_amount,
                              guest_name, guest_phone, note, hold_expires_at)
         VALUES ($1, 'SINGLE', 'HELD', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 now() + ($11 || ' minutes')::interval)
         RETURNING *`,
        [
          makeCode(),
          field.venue_id,
          userId,
          team?.id || null,
          total,
          deposit,
          quote.discount,
          guest_name || null,
          guest_phone || null,
          note || null,
          HOLD_MINUTES,
        ]
      );
      const booking = b.rows[0];

      // Giu khung gio - rang buoc EXCLUDE se chan neu trung
      const slot = await insertSlot(c, {
        bookingId: booking.id,
        fieldId: field_id,
        playDate: play_date,
        start,
        end,
        price: quote.amount,
        status: 'HELD',
        quote,
      });

      for (const s of services) {
        await c.query(
          `INSERT INTO booking_service (booking_id, service_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (booking_id, service_id) DO UPDATE SET quantity = booking_service.quantity + EXCLUDED.quantity`,
          [booking.id, s.id, s.name, s.price, s.quantity]
        );
      }

      let matchPost = null;
      if (team) {
        const p = await c.query(
          `INSERT INTO match_post (type, booking_id, author_user_id, team_id, district_code, play_date,
                                   time_span, required_level, deal_note, content, expires_at)
           VALUES ('TEAM_FINDS_TEAM', $1, $2, $3, $4, $5::date, int4range($6, $7), $8, $9, $10,
                   ($5 || ' ' || $11)::timestamptz)
           RETURNING id`,
          [
            booking.id,
            userId,
            team.id,
            field.district_code,
            play_date,
            toMinutes(start),
            toMinutes(end),
            team.skill_level,
            deal_note || 'Chia đôi tiền sân',
            note || null,
            start,
          ]
        );
        matchPost = p.rows[0];
      }

      return {
        ...booking,
        slots: [slot],
        services,
        price_rule_id: quote.priceRuleId,
        promotion_id: quote.promotionId,
        hours: quote.hours,
        match_post_id: matchPost?.id || null,
      };
    });

    res.status(201).json(out);
  } catch (err) {
    // Ma loi PostgreSQL (23P01 trung khung gio, 23514 vi pham check...)
    // duoc errorHandler quy doi sang ma loi cua he thong.
    next(err);
  }
});

// POST /api/bookings/recurring - Dat san dinh ky (UC-05)
// body: { field_id, weekdays: [1..7] (ISO, 1 = Thu 2), start_date, months, start, end, note?, skip_conflicts? }
// skip_conflicts = true: bo qua cac buoi da co nguoi dat, chi ky hop dong cac buoi con lai
router.post('/recurring', requireAuthenticated, async (req, res, next) => {
  const { field_id, weekdays, start_date, months, start, end, note, skip_conflicts = false } = req.body || {};

  try {
    requireFields(req.body, ['field_id', 'weekdays', 'start_date', 'months', 'start', 'end']);
    const days = Array.isArray(weekdays) ? [...new Set(weekdays.map(Number))] : [];
    if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'weekdays', reason: 'ISO weekday 1-7' } });
    }
    const monthCount = Number(months);
    if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 6) {
      throw new AppError('INVALID_FIELD', { details: { field: 'months', reason: '1-6' } });
    }

    // Liet ke cac buoi: moi ngay trong [start_date, start_date + months) roi vao weekdays
    const first = new Date(`${start_date}T00:00:00Z`);
    if (Number.isNaN(first.getTime())) {
      throw new AppError('INVALID_FIELD', { details: { field: 'start_date' } });
    }
    const last = new Date(first);
    last.setUTCMonth(last.getUTCMonth() + monthCount);
    let dates = [];
    for (let d = new Date(first); d < last; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = ((d.getUTCDay() + 6) % 7) + 1;
      if (days.includes(iso)) dates.push(d.toISOString().slice(0, 10));
    }
    if (dates.length === 0) throw new AppError('INVALID_FIELD', { details: { field: 'weekdays' } });

    const out = await withTransaction(async (c) => {
      await assertSlotTimes(c, dates[0], start, end);
      const field = await loadField(c, field_id);

      // Bao truoc tat ca cac buoi bi trung de nguoi dung doi lich mot lan
      const conflicts = [];
      for (const d of dates) {
        const a = await c.query(
          `SELECT fn_is_slot_available($1, tstzrange(($2 || ' ' || $3)::timestamptz,
                                                     ($2 || ' ' || $4)::timestamptz, '[)')) AS ok`,
          [field_id, d, start, end]
        );
        if (!a.rows[0].ok) conflicts.push(d);
      }
      if (conflicts.length && !skip_conflicts) {
        throw new AppError('RECURRING_CONFLICT', {
          details: { dates: conflicts, sessions_total: dates.length, sessions_available: dates.length - conflicts.length },
        });
      }
      dates = dates.filter((d) => !conflicts.includes(d));
      if (dates.length === 0) throw new AppError('RECURRING_CONFLICT', { details: { dates: conflicts, sessions_available: 0 } });

      const discountPercent = contractDiscount(
        (
          await c.query(
            `SELECT discount_percent, min_contract_months FROM promotion
            WHERE venue_id = $1 AND type = 'CONTRACT_DISCOUNT' AND is_active`,
            [field.venue_id]
          )
        ).rows,
        monthCount
      );

      const quotes = [];
      for (const d of dates) {
        quotes.push({
          date: d,
          quote: await quoteSlot(c, {
            venueId: field.venue_id,
            fieldType: field.type,
            playDate: d,
            start,
            end,
          }),
        });
      }
      const gross = quotes.reduce((s, q) => s + q.quote.baseAmount, 0);
      const perSession = quotes.map((q) => Math.round((q.quote.baseAmount * (100 - discountPercent)) / 100));
      const total = perSession.reduce((s, x) => s + x, 0);
      const deposit = Math.round(total * Number(field.deposit_rate));

      const b = await c.query(
        `INSERT INTO booking (code, kind, status, venue_id, user_id, total_amount, deposit_amount,
                              discount_amount, note, hold_expires_at)
         VALUES ($1, 'RECURRING', 'HELD', $2, $3, $4, $5, $6, $7, now() + ($8 || ' minutes')::interval)
         RETURNING *`,
        [makeCode(), field.venue_id, req.user.id, total, deposit, gross - total, note || null, HOLD_MINUTES]
      );
      const booking = b.rows[0];

      const slots = [];
      for (let i = 0; i < quotes.length; i++) {
        slots.push(
          await insertSlot(c, {
            bookingId: booking.id,
            fieldId: field_id,
            playDate: quotes[i].date,
            start,
            end,
            price: perSession[i],
            status: 'HELD',
            quote: quotes[i].quote,
          })
        );
      }

      await c.query(
        `INSERT INTO recurring_contract (booking_id, weekdays, start_date, end_date, time_span,
                                         sessions_total, discount_percent)
         VALUES ($1, $2, $3, $4, int4range($5, $6), $7, $8)`,
        [
          booking.id,
          days.sort(),
          dates[0],
          dates[dates.length - 1],
          toMinutes(start),
          toMinutes(end),
          dates.length,
          discountPercent,
        ]
      );

      return {
        ...booking,
        slots,
        sessions_total: dates.length,
        skipped_dates: conflicts,
        contract_discount: discountPercent,
      };
    });

    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:code
// Chi nguoi dat, nguoi da duoc nhan vao tran, chu san va admin xem duoc (don co SDT, so tai khoan)
router.get('/:code', requireAuthenticated, async (req, res, next) => {
  try {
    const b = await query(
      `SELECT b.*, v.name AS venue_name, v.bank_name, v.bank_account, v.bank_holder, v.owner_id AS venue_owner_id,
              (SELECT COALESCE(sum(t.amount), 0) FROM bank_transaction t
                WHERE t.booking_id = b.id AND t.status IN ('PARTIAL', 'APPLIED'))
                + (SELECT COALESCE(sum(pw.amount), 0) FROM payment pw
                    WHERE pw.booking_id = b.id AND pw.method = 'WALLET' AND pw.status = 'SUCCESS') AS amount_received,
              (SELECT COALESCE(sum(t.amount), 0) FROM bank_transaction t
                WHERE t.booking_id = b.id AND t.status = 'REFUND_PENDING') AS refund_pending_amount,
              EXISTS (SELECT 1 FROM match_participant mp
                       WHERE mp.booking_id = b.id AND mp.user_id = $2 AND mp.cancelled_at IS NULL) AS is_participant
         FROM booking b JOIN venue v ON v.id = b.venue_id
        WHERE b.code = $1`,
      [req.params.code, req.user.id]
    );
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.params.code } });
    const row = b.rows[0];
    const allowed =
      row.user_id === req.user.id || row.venue_owner_id === req.user.id || row.is_participant || req.user.role === 'ADMIN';
    if (!allowed) throw new AppError('FORBIDDEN');

    const pays = await query(
      `SELECT id, method, status, amount, provider_ref, bill_image_url, paid_at, created_at
         FROM payment WHERE booking_id = $1 ORDER BY created_at`,
      [b.rows[0].id]
    );

    res.json({
      ...b.rows[0],
      slots: await loadSlots(b.rows[0].id),
      services: await loadServices(b.rows[0].id),
      payments: pays.rows,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/bookings/:code/cancel  body: { reason? }
router.post('/:code/cancel', requireAuthenticated, async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await c.query(
        `SELECT b.id, b.status, b.user_id, v.owner_id
           FROM booking b JOIN venue v ON v.id = b.venue_id
          WHERE b.code = $1 FOR UPDATE OF b`,
        [req.params.code]
      );
      if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.params.code } });
      const row = b.rows[0];
      if (row.user_id !== req.user.id && row.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('FORBIDDEN');
      }
      if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(row.status)) {
        throw new AppError('INVALID_STATUS', {
          message: `Don dang o trang thai ${row.status}, khong the huy`,
          details: { status: row.status, allowed: ['HELD', 'PENDING_VERIFY', 'CONFIRMED'] },
        });
      }
      const started = await c.query(
        `SELECT min(lower(time_range)) AS starts_at, min(lower(time_range)) <= now() AS started
           FROM booking_slot WHERE booking_id = $1`,
        [row.id]
      );
      if (started.rows[0].started) {
        throw new AppError('BOOKING_ALREADY_STARTED', { details: { starts_at: started.rows[0].starts_at } });
      }
      await c.query(
        `UPDATE booking SET status = 'CANCELLED_BY_USER', cancelled_at = now(),
                            cancel_reason = $2, hold_expires_at = NULL
          WHERE id = $1`,
        [row.id, (req.body && req.body.reason) || 'Nguoi dung huy']
      );
      const s = await c.query(
        `UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1 RETURNING id`,
        [row.id]
      );
      await c.query(
        `UPDATE match_post SET status = 'CLOSED', closed_at = now()
          WHERE booking_id = $1 AND status = 'OPEN'`,
        [row.id]
      );
      return { code: req.params.code, status: 'CANCELLED_BY_USER', released_slots: s.rowCount };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:code/rate  body: { pitch_rating, service_rating, comment? }
// Ghi vao bang review -> trigger tg_review_rating cap nhat diem trung binh cua cum san
router.post('/:code/rate', requireAuthenticated, async (req, res, next) => {
  try {
    requireFields(req.body, ['pitch_rating', 'service_rating']);
    const pitch = Number(req.body.pitch_rating);
    const service = Number(req.body.service_rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : '';
    if (![pitch, service].every((x) => Number.isInteger(x) && x >= 1 && x <= 5)) {
      throw new AppError('INVALID_RATING');
    }

    const b = await query(
      `SELECT b.id, b.status, b.user_id, b.venue_id,
              (SELECT max(upper(time_range)) <= now() FROM booking_slot WHERE booking_id = b.id) AS ended
         FROM booking b WHERE b.code = $1`,
      [req.params.code]
    );
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: req.params.code } });
    const booking = b.rows[0];
    if (booking.user_id !== req.user.id) throw new AppError('FORBIDDEN');
    if (!['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) || !booking.ended) {
      throw new AppError('CANNOT_RATE', { details: { status: booking.status } });
    }

    const r = await query(
      `INSERT INTO review (booking_id, venue_id, user_id, pitch_rating, service_rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING id, pitch_rating, service_rating, comment, created_at`,
      [booking.id, booking.venue_id, req.user.id, pitch, service, comment || null]
    );
    if (r.rowCount === 0) throw new AppError('ALREADY_RATED');
    res.status(201).json({ code: req.params.code, ...r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/maintenance/release-expired  -> goi tay ham don don qua han (job nen da chay moi 60 giay)
router.post('/maintenance/release-expired', requireAuthenticated, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const r = await query(`SELECT fn_release_expired_holds() AS released`);
    res.json({ released: r.rows[0].released });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
