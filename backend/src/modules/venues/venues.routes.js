'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const router = express.Router();

// GET /api/venues?district=CG&q=my dinh&fieldType=5-a-side&maxPrice=500000&minRating=3.5&amenities=Den,Wifi&date=2026-09-10
// Tra kem san con, bang gia, dich vu, khuyen mai va slot da kin trong `date` de trang chu
// khong phai goi /venues/:id + /fields/:id/schedule cho tung san (N+1)
router.get('/', async (req, res, next) => {
  try {
    const { district, q, fieldType, maxPrice, minRating, amenities, date } = req.query;
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'date', reason: 'Format YYYY-MM-DD' } });
    }

    // Parse numeric values
    const max_price = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;
    const min_rating = minRating ? parseFloat(minRating) : 0;
    const field_type = fieldType ? fieldType.trim() : null;
    const amenity_list = amenities ? amenities.split(',').map((a) => a.trim().toLowerCase()) : [];

    let sql = `SELECT v.id, v.owner_id, v.name, v.address, v.district_code, d.name AS district_name,
              v.latitude, v.longitude, v.phone, v.avg_rating, v.rating_count,
              v.open_time, v.close_time, v.deposit_rate,
              (SELECT count(*) FROM field f WHERE f.venue_id = v.id AND f.is_active) AS field_count,
              (SELECT min(round(pr.base_price * pr.multiplier))
                 FROM price_rule pr WHERE pr.venue_id = v.id) AS min_price,
              COALESCE((SELECT json_agg(json_build_object('code', a.code, 'name', a.name) ORDER BY a.name)
                 FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code
                WHERE va.venue_id = v.id), '[]') AS amenities
         FROM venue v
         JOIN district d ON d.code = v.district_code
        WHERE v.status = 'APPROVED'`;

    const params = [];
    if (district) {
      params.push(district);
      sql += ` AND v.district_code = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      const param_idx = params.length;
      sql += ` AND (v.name ILIKE $${param_idx} OR v.address ILIKE $${param_idx})`;
    }
    if (field_type) {
      params.push(field_type);
      sql += ` AND EXISTS (SELECT 1 FROM field f WHERE f.venue_id = v.id AND f.is_active AND f.type = $${params.length})`;
    }
    if (max_price < Number.MAX_VALUE) {
      params.push(max_price);
      sql += ` AND (SELECT min(round(pr.base_price * pr.multiplier)) FROM price_rule pr WHERE pr.venue_id = v.id) <= $${params.length}`;
    }
    if (min_rating > 0) {
      params.push(min_rating);
      sql += ` AND v.avg_rating >= $${params.length}`;
    }

    sql += ` ORDER BY v.avg_rating DESC, v.rating_count DESC`;

    const r = await query(sql, params);

    // Post-process to filter by amenities if provided
    let filtered_rows = r.rows;
    if (amenity_list.length > 0) {
      filtered_rows = r.rows.filter((venue) => {
        const venue_amenities = venue.amenities || [];
        return amenity_list.every((req_amenity) =>
          venue_amenities.some((a) => a.name.toLowerCase() === req_amenity || a.code.toLowerCase() === req_amenity)
        );
      });
    }

    const ids = filtered_rows.map((row) => row.id);
    if (ids.length === 0) return res.json({ count: 0, data: [] });

    const [fields, prices, services, flash, contract, schedule] = await Promise.all([
      query(`SELECT id, venue_id, name, type, is_active FROM field WHERE venue_id = ANY($1) ORDER BY name`, [ids]),
      query(
        `SELECT venue_id, field_type, day_type,
                lower(time_span) AS from_minute, upper(time_span) AS to_minute,
                base_price, multiplier, label,
                round(base_price * multiplier) AS price_per_hour
           FROM price_rule WHERE venue_id = ANY($1)
          ORDER BY field_type, day_type, lower(time_span)`,
        [ids]
      ),
      query(
        `SELECT id, venue_id, name, price, category, stock FROM venue_service
          WHERE venue_id = ANY($1) AND is_active AND (stock IS NULL OR stock > 0) ORDER BY price`,
        [ids]
      ),
      query(
        `SELECT DISTINCT ON (venue_id) id, venue_id, discount_percent, trigger_hours_before, floor_price,
                applies_field_type,
                (SELECT json_agg(json_build_object('from_minute', lower(t.time_span), 'to_minute', upper(t.time_span)))
                   FROM promotion_time_span t WHERE t.promotion_id = promotion.id) AS time_spans
           FROM promotion
          WHERE venue_id = ANY($1) AND type = 'FLASH_SALE' AND is_active
            AND (valid_from IS NULL OR valid_from <= current_date)
            AND (valid_to IS NULL OR valid_to >= current_date)
          ORDER BY venue_id, discount_percent DESC`,
        [ids]
      ),
      query(
        `SELECT venue_id, discount_percent, min_contract_months FROM promotion
          WHERE venue_id = ANY($1) AND type = 'CONTRACT_DISCOUNT' AND is_active
          ORDER BY min_contract_months NULLS FIRST`,
        [ids]
      ),
      // Chi tra trang thai slot, khong tra ten khach: danh sach nay la public cho moi san
      query(
        `SELECT venue_id, field_id, start_at, end_at, slot_status
           FROM v_field_schedule
          WHERE venue_id = ANY($1) AND play_date = COALESCE($2::date, current_date)
          ORDER BY start_at`,
        [ids, date || null]
      ),
    ]);

    const byVenue = (rows) => {
      const map = new Map();
      for (const row of rows) {
        if (!map.has(row.venue_id)) map.set(row.venue_id, []);
        map.get(row.venue_id).push(row);
      }
      return map;
    };
    const fieldMap = byVenue(fields.rows);
    const priceMap = byVenue(prices.rows);
    const serviceMap = byVenue(services.rows);
    const flashMap = byVenue(flash.rows);
    const contractMap = byVenue(contract.rows);
    const scheduleMap = byVenue(schedule.rows);

    const data = filtered_rows.map((row) => ({
      ...row,
      fields: fieldMap.get(row.id) || [],
      price_rules: priceMap.get(row.id) || [],
      services: serviceMap.get(row.id) || [],
      flash_sale: flashMap.get(row.id)?.[0] || null,
      contract_discounts: contractMap.get(row.id) || [],
      schedule: scheduleMap.get(row.id) || [],
    }));

    res.json({ count: data.length, data });
  } catch (e) {
    next(e);
  }
});

// GET /api/venues/flash-sales
// Cac cum san dang bat Flash Sale, kem san con + bang gia + lich da kin hom nay/ngay mai
// de frontend dung chung luoi slot voi trang chi tiet san (buildSlots)
router.get('/flash-sales', async (req, res, next) => {
  try {
    const v = await query(
      `SELECT DISTINCT ON (v.id) v.id, v.name, v.address, v.district_code, d.name AS district_name,
              v.open_time, v.close_time, v.deposit_rate,
              json_build_object(
                'id', p.id, 'discount_percent', p.discount_percent,
                'trigger_hours_before', p.trigger_hours_before, 'floor_price', p.floor_price,
                'applies_field_type', p.applies_field_type,
                'time_spans', (SELECT json_agg(json_build_object('from_minute', lower(t.time_span), 'to_minute', upper(t.time_span)))
                                 FROM promotion_time_span t WHERE t.promotion_id = p.id)) AS flash_sale
         FROM venue v
         JOIN district d ON d.code = v.district_code
         JOIN promotion p ON p.venue_id = v.id AND p.type = 'FLASH_SALE' AND p.is_active
          AND (p.valid_from IS NULL OR p.valid_from <= current_date)
          AND (p.valid_to IS NULL OR p.valid_to >= current_date)
        WHERE v.status = 'APPROVED'
        ORDER BY v.id, p.discount_percent DESC`
    );
    const ids = v.rows.map((r) => r.id);
    if (ids.length === 0) return res.json({ count: 0, data: [] });

    const [fields, prices, schedule] = await Promise.all([
      query(`SELECT id, venue_id, name, type, is_active FROM field WHERE venue_id = ANY($1) ORDER BY name`, [ids]),
      query(
        `SELECT venue_id, field_type, day_type,
                lower(time_span) AS from_minute, upper(time_span) AS to_minute,
                base_price, multiplier, label,
                round(base_price * multiplier) AS price_per_hour
           FROM price_rule WHERE venue_id = ANY($1)
          ORDER BY field_type, day_type, lower(time_span)`,
        [ids]
      ),
      query(
        `SELECT venue_id, field_id, play_date::text AS play_date, start_at, end_at, slot_status
           FROM v_field_schedule
          WHERE venue_id = ANY($1) AND play_date BETWEEN current_date AND current_date + 1`,
        [ids]
      ),
    ]);

    const data = v.rows.map((row) => ({
      ...row,
      fields: fields.rows.filter((f) => f.venue_id === row.id),
      price_rules: prices.rows.filter((p) => p.venue_id === row.id),
      schedule: schedule.rows.filter((s) => s.venue_id === row.id),
    }));
    res.json({ count: data.length, data });
  } catch (e) {
    next(e);
  }
});

// GET /api/venues/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const v = await query(
      `SELECT v.*, d.name AS district_name
         FROM venue v JOIN district d ON d.code = v.district_code
        WHERE v.id = $1`,
      [id]
    );
    if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND', { details: { id } });

    const fields = await query(
      `SELECT id, name, type, is_active FROM field WHERE venue_id = $1 ORDER BY name`,
      [id]
    );
    const amenities = await query(
      `SELECT a.code, a.name FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code
        WHERE va.venue_id = $1 ORDER BY a.name`,
      [id]
    );
    const prices = await query(
      `SELECT field_type, day_type,
              lower(time_span) AS from_minute, upper(time_span) AS to_minute,
              base_price, multiplier, label,
              round(base_price * multiplier) AS price_per_hour
         FROM price_rule WHERE venue_id = $1
        ORDER BY field_type, day_type, lower(time_span)`,
      [id]
    );

    const services = await query(
      `SELECT id, name, price, category, stock FROM venue_service
        WHERE venue_id = $1 AND is_active AND (stock IS NULL OR stock > 0) ORDER BY price`,
      [id]
    );
    const flash = await query(
      `SELECT id, discount_percent, trigger_hours_before, floor_price, applies_field_type,
              (SELECT json_agg(json_build_object('from_minute', lower(t.time_span), 'to_minute', upper(t.time_span)))
                 FROM promotion_time_span t WHERE t.promotion_id = promotion.id) AS time_spans
         FROM promotion
        WHERE venue_id = $1 AND type = 'FLASH_SALE' AND is_active
          AND (valid_from IS NULL OR valid_from <= current_date)
          AND (valid_to IS NULL OR valid_to >= current_date)
        ORDER BY discount_percent DESC LIMIT 1`,
      [id]
    );

    const contract = await query(
      `SELECT discount_percent, min_contract_months FROM promotion
        WHERE venue_id = $1 AND type = 'CONTRACT_DISCOUNT' AND is_active
        ORDER BY min_contract_months NULLS FIRST`,
      [id]
    );

    res.json({
      ...v.rows[0],
      fields: fields.rows,
      amenities: amenities.rows,
      price_rules: prices.rows,
      services: services.rows,
      flash_sale: flash.rows[0] || null,
      // Rong = dung chiet khau mac dinh cua he thong (10% / 15% tu 3 thang)
      contract_discounts: contract.rows,
    });
  } catch (e) {
    next(e);
  }
});

// Chu san chi thao tac tren cum san cua minh; admin thao tac duoc moi cum san
async function loadOwnedVenue(c, venueId, user, lock = false) {
  const v = await c.query(`SELECT * FROM venue WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [venueId]);
  if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
  if (user.role !== 'ADMIN' && v.rows[0].owner_id !== user.id) throw new AppError('FORBIDDEN');
  return v.rows[0];
}

const FIELD_TYPES = ['F5', 'F7', 'F11'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:00)?$/;

// Kiem tra cac truong cua venue; partial = true khi sua (chi kiem tra truong co gui len)
function validateVenueBody(body, partial) {
  const bad = (field, reason) => new AppError('INVALID_FIELD', { details: { field, reason } });
  const has = (k) => body[k] !== undefined && body[k] !== null && body[k] !== '';
  if (!partial) requireFields(body, ['name', 'address', 'district_code', 'phone']);

  if (has('name') && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 150)) {
    throw bad('name', 'Tối đa 150 ký tự');
  }
  if (has('address') && (typeof body.address !== 'string' || !body.address.trim() || body.address.length > 300)) {
    throw bad('address', 'Tối đa 300 ký tự');
  }
  if (has('phone') && !/^0[0-9]{9}$/.test(body.phone)) throw bad('phone', 'Số điện thoại 10 chữ số');
  for (const k of ['open_time', 'close_time']) {
    if (has(k) && !TIME_RE.test(body[k])) throw bad(k, 'Định dạng HH:MM');
  }
  if (has('deposit_rate')) {
    const r = Number(body.deposit_rate);
    if (!Number.isFinite(r) || r < 0 || r > 1) throw bad('deposit_rate', 'Từ 0 đến 1');
  }
  const hasLat = has('latitude');
  const hasLon = has('longitude');
  if (hasLat !== hasLon) throw bad('coordinates', 'Cần cả vĩ độ và kinh độ');
  if (hasLat && (!Number.isFinite(Number(body.latitude)) || !Number.isFinite(Number(body.longitude)))) {
    throw bad('coordinates', 'Phải là số');
  }
  if (has('bank_account') && !/^[0-9]{6,20}$/.test(String(body.bank_account))) {
    throw bad('bank_account', 'Số tài khoản 6-20 chữ số');
  }
  if (body.amenities !== undefined && !Array.isArray(body.amenities)) throw bad('amenities', 'Phải là mảng');
  if (body.fields !== undefined) {
    if (!Array.isArray(body.fields)) throw bad('fields', 'Phải là mảng');
    body.fields.forEach((f, i) => {
      if (!f || typeof f.name !== 'string' || !f.name.trim() || f.name.length > 50) {
        throw bad(`fields[${i}].name`, 'Tối đa 50 ký tự');
      }
      if (!FIELD_TYPES.includes(f.type)) throw bad(`fields[${i}].type`, FIELD_TYPES.join(' | '));
    });
  }
}

const nullable = (v) => (v === undefined || v === null || v === '' ? null : v);

async function replaceAmenities(c, venueId, amenities) {
  await c.query(`DELETE FROM venue_amenity WHERE venue_id = $1`, [venueId]);
  if (amenities.length) {
    await c.query(
      `INSERT INTO venue_amenity (venue_id, amenity_code)
       SELECT $1, code FROM amenity WHERE code = ANY($2::text[])`,
      [venueId, amenities.map(String)]
    );
  }
}

// GET /api/venues/:id/revenue  (chu san cua cum san / admin)
router.get('/:id/revenue', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await loadOwnedVenue({ query }, venueId, req.user);
    const r = await query(
      `SELECT * FROM v_venue_daily_revenue WHERE venue_id = $1 ORDER BY 2 DESC LIMIT 60`,
      [venueId]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/venues - Chu san dang ky cum san moi -> trang thai PENDING cho admin duyet
// body: { name, address, district_code, phone, latitude?, longitude?, open_time?, close_time?, deposit_rate?,
//         description?, bank_name?, bank_account?, bank_holder?, amenities?: [code], fields?: [{ name, type }] }
router.post('/', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const body = req.body || {};
    validateVenueBody(body, false);
    // Admin tao ho cho mot chu san cu the; chu san luon tao cho chinh minh
    const ownerId = req.user.role === 'ADMIN' && body.owner_id ? Number(body.owner_id) : req.user.id;

    const result = await withTransaction(async (c) => {
      const v = await c.query(
        `INSERT INTO venue (owner_id, name, address, district_code, phone, latitude, longitude, description,
                            open_time, close_time, deposit_rate, bank_name, bank_account, bank_holder, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::time, '06:00'), COALESCE($10::time, '23:59'),
                 COALESCE($11::numeric, 0.3), $12, $13, $14, 'PENDING')
         RETURNING *`,
        [
          ownerId,
          body.name.trim(),
          body.address.trim(),
          body.district_code,
          body.phone,
          nullable(body.latitude),
          nullable(body.longitude),
          nullable(body.description),
          nullable(body.open_time),
          nullable(body.close_time),
          nullable(body.deposit_rate),
          nullable(body.bank_name),
          nullable(body.bank_account),
          nullable(body.bank_holder),
        ]
      );
      const venue = v.rows[0];
      if (Array.isArray(body.amenities)) await replaceAmenities(c, venue.id, body.amenities);
      for (const f of body.fields || []) {
        await c.query(`INSERT INTO field (venue_id, name, type) VALUES ($1, $2, $3)`, [
          venue.id,
          f.name.trim(),
          f.type,
        ]);
      }
      await c.query(`INSERT INTO venue_approval (venue_id, action) VALUES ($1, 'SUBMIT')`, [venue.id]);
      return venue;
    });

    res.status(201).json({ message: 'Venue created', venue: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/venues/:id - Sua thong tin cum san.
// Cum san dang REJECTED duoc sua se tu dong gui duyet lai (PENDING).
router.put('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const body = req.body || {};
    validateVenueBody(body, true);

    const COLUMNS = [
      'name',
      'address',
      'district_code',
      'phone',
      'latitude',
      'longitude',
      'description',
      'open_time',
      'close_time',
      'deposit_rate',
      'bank_name',
      'bank_account',
      'bank_holder',
    ];

    const out = await withTransaction(async (c) => {
      const current = await loadOwnedVenue(c, venueId, req.user, true);
      const sets = [];
      const values = [venueId];
      for (const col of COLUMNS) {
        if (body[col] === undefined) continue;
        values.push(typeof body[col] === 'string' ? body[col].trim() || null : body[col]);
        sets.push(`${col} = $${values.length}`);
      }
      const resubmit = current.status === 'REJECTED' && req.user.role !== 'ADMIN';
      if (resubmit) sets.push(`status = 'PENDING'`);
      if (sets.length) {
        sets.push('updated_at = now()');
        await c.query(`UPDATE venue SET ${sets.join(', ')} WHERE id = $1`, values);
      }
      if (Array.isArray(body.amenities)) await replaceAmenities(c, venueId, body.amenities);
      if (resubmit) await c.query(`INSERT INTO venue_approval (venue_id, action) VALUES ($1, 'SUBMIT')`, [venueId]);
      return (await c.query(`SELECT * FROM venue WHERE id = $1`, [venueId])).rows[0];
    });

    res.json({ message: 'Venue updated', venue: out });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/venues/:id - Xoa cum san (khong xoa duoc khi da co don dat)
router.delete('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    await withTransaction(async (c) => {
      await loadOwnedVenue(c, venueId, req.user, true);
      const used = await c.query(`SELECT 1 FROM booking WHERE venue_id = $1 LIMIT 1`, [venueId]);
      if (used.rowCount) {
        throw new AppError('INVALID_OPERATION', {
          message: 'Cụm sân đã có đơn đặt, không thể xóa. Hãy tạm ngưng các sân con thay vì xóa.',
        });
      }
      await c.query(`DELETE FROM venue WHERE id = $1`, [venueId]);
    });
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/venues/:id/images  body: { image_urls: [string] }
router.post('/:id/images', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { image_urls } = req.body || {};
    if (
      !Array.isArray(image_urls) ||
      image_urls.length === 0 ||
      image_urls.some((u) => typeof u !== 'string' || !/^https?:\/\//.test(u) || u.length > 500)
    ) {
      throw new AppError('INVALID_FIELD', { details: { field: 'image_urls', reason: 'Mảng URL http(s), tối đa 500 ký tự' } });
    }

    const images = await withTransaction(async (c) => {
      await loadOwnedVenue(c, venueId, req.user, true);
      const max = await c.query(`SELECT COALESCE(max(sort_order), 0) AS n FROM venue_image WHERE venue_id = $1`, [
        venueId,
      ]);
      const out = [];
      for (let i = 0; i < image_urls.length; i++) {
        const r = await c.query(
          `INSERT INTO venue_image (venue_id, url, sort_order, is_cover)
           VALUES ($1, $2, $3, NOT EXISTS (SELECT 1 FROM venue_image WHERE venue_id = $1))
           RETURNING id, url, sort_order, is_cover`,
          [venueId, image_urls[i], Number(max.rows[0].n) + i + 1]
        );
        out.push(r.rows[0]);
      }
      return out;
    });

    res.status(201).json({ message: 'Images uploaded', images });
  } catch (err) {
    next(err);
  }
});

// PUT /api/venues/:id/images/order  body: { image_ids: [id] } (anh dau tien la anh bia)
router.put('/:id/images/order', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { image_ids } = req.body || {};
    if (!Array.isArray(image_ids)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'image_ids', reason: 'Array required' } });
    }

    await withTransaction(async (c) => {
      await loadOwnedVenue(c, venueId, req.user, true);
      for (let i = 0; i < image_ids.length; i++) {
        await c.query(
          `UPDATE venue_image SET sort_order = $1, is_cover = ($1 = 1) WHERE id = $2 AND venue_id = $3`,
          [i + 1, Number(image_ids[i]), venueId]
        );
      }
    });

    res.json({ message: 'Image order updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
