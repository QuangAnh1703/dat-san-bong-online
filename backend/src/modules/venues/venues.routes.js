'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const router = express.Router();

// GET /api/venues?district=CG&q=my dinh&fieldType=5-a-side&maxPrice=500000&minRating=3.5&amenities=Den,Wifi
router.get('/', async (req, res, next) => {
  try {
    const { district, q, fieldType, maxPrice, minRating, amenities } = req.query;

    // Parse numeric values
    const max_price = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;
    const min_rating = minRating ? parseFloat(minRating) : 0;
    const field_type = fieldType ? fieldType.trim() : null;
    const amenity_list = amenities ? amenities.split(',').map((a) => a.trim().toLowerCase()) : [];

    let sql = `SELECT DISTINCT v.id, v.name, v.address, v.district_code, d.name AS district_name,
              v.phone, v.avg_rating, v.rating_count,
              v.open_time, v.close_time, v.deposit_rate,
              (SELECT count(*) FROM field f WHERE f.venue_id = v.id AND f.is_active) AS field_count,
              (SELECT min(round(pr.base_price * pr.multiplier))
                 FROM price_rule pr WHERE pr.venue_id = v.id) AS min_price,
              COALESCE((SELECT array_agg(DISTINCT a.name ORDER BY a.name)
                 FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code
                WHERE va.venue_id = v.id), '{}') AS amenities
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
          venue_amenities.some((v_amenity) => v_amenity.toLowerCase() === req_amenity)
        );
      });
    }

    res.json({ count: filtered_rows.length, data: filtered_rows });
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
      `SELECT id, name, price FROM venue_service WHERE venue_id = $1 AND is_active ORDER BY price`,
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

// GET /api/venues/:id/revenue  (dung view co san)
router.get('/:id/revenue', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM v_venue_daily_revenue WHERE venue_id = $1 ORDER BY 2 DESC LIMIT 60`,
      [Number(req.params.id)]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/venues - Create venue (SCRUM-115, OWNER/ADMIN only)
router.post('/', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const {
      name,
      address,
      district_code,
      phone,
      latitude,
      longitude,
      open_time,
      close_time,
      deposit_rate,
      amenities,
    } = req.body;
    requireFields(req.body, ['name', 'address', 'district_code', 'phone', 'latitude', 'longitude']);

    // Validation
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 120) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'name', reason: 'Max 120 chars' } }));
    }
    if (typeof address !== 'string' || address.length > 255) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'address', reason: 'Max 255 chars' } }));
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'phone', reason: 'Invalid format' } }));
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return next(
        new AppError('INVALID_FIELD', { details: { field: 'coordinates', reason: 'Must be numbers' } })
      );
    }

    const result = await withTransaction(async (c) => {
      // Create venue
      const v = await c.query(
        `INSERT INTO venue (name, address, district_code, phone, latitude, longitude, open_time, close_time, deposit_rate, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
         RETURNING id, name, address, district_code, phone, latitude, longitude, status, created_at`,
        [
          name.trim(),
          address.trim(),
          district_code,
          phone,
          latitude,
          longitude,
          open_time || '09:00',
          close_time || '22:00',
          deposit_rate || 0,
        ]
      );

      const venueId = v.rows[0].id;

      // Add amenities if provided
      if (Array.isArray(amenities) && amenities.length > 0) {
        for (const amenityCode of amenities) {
          await c.query(`INSERT INTO venue_amenity (venue_id, amenity_code) VALUES ($1, $2)`, [
            venueId,
            amenityCode,
          ]);
        }
      }

      return v.rows[0];
    });

    res.status(201).json({ message: 'Venue created', venue: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/venues/:id - Update venue (SCRUM-115)
router.put('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { name, address, phone, open_time, close_time, deposit_rate, amenities } = req.body;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 120)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'name', reason: 'Max 120 chars' } }));
    }
    if (phone !== undefined && !/^[0-9]{10}$/.test(phone)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'phone', reason: 'Invalid format' } }));
    }

    const updates = [];
    const values = [venueId];
    let paramCount = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
      paramCount++;
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address.trim());
      paramCount++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    if (open_time !== undefined) {
      updates.push(`open_time = $${paramCount}`);
      values.push(open_time);
      paramCount++;
    }
    if (close_time !== undefined) {
      updates.push(`close_time = $${paramCount}`);
      values.push(close_time);
      paramCount++;
    }
    if (deposit_rate !== undefined) {
      updates.push(`deposit_rate = $${paramCount}`);
      values.push(deposit_rate);
      paramCount++;
    }

    updates.push(`updated_at = now()`);

    if (updates.length === 1) {
      return res.json({ message: 'No changes' });
    }

    const updateQuery = `UPDATE venue SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await query(updateQuery, values);

    if (result.rowCount === 0) {
      return next(new AppError('VENUE_NOT_FOUND'));
    }

    // Update amenities if provided
    if (Array.isArray(amenities)) {
      await query(`DELETE FROM venue_amenity WHERE venue_id = $1`, [venueId]);
      for (const amenityCode of amenities) {
        await query(`INSERT INTO venue_amenity (venue_id, amenity_code) VALUES ($1, $2)`, [
          venueId,
          amenityCode,
        ]);
      }
    }

    res.json({ message: 'Venue updated', venue: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/venues/:id - Delete venue (SCRUM-115)
router.delete('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);

    const result = await withTransaction(async (c) => {
      // Delete related data
      await c.query(`DELETE FROM venue_amenity WHERE venue_id = $1`, [venueId]);
      await c.query(`DELETE FROM venue_image WHERE venue_id = $1`, [venueId]);
      await c.query(`DELETE FROM field WHERE venue_id = $1`, [venueId]);

      // Delete venue
      const r = await c.query(`DELETE FROM venue WHERE id = $1 RETURNING id`, [venueId]);
      return r.rowCount;
    });

    if (result === 0) {
      return next(new AppError('VENUE_NOT_FOUND'));
    }

    res.json({ message: 'Venue deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/venues/:id/images - Upload venue images (SCRUM-117)
router.post('/:id/images', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { image_urls } = req.body;

    if (!Array.isArray(image_urls) || image_urls.length === 0) {
      return next(
        new AppError('INVALID_FIELD', { details: { field: 'image_urls', reason: 'Array required' } })
      );
    }

    const images = [];
    for (let i = 0; i < image_urls.length; i++) {
      const r = await query(
        `INSERT INTO venue_image (venue_id, image_url, display_order, uploaded_at)
         VALUES ($1, $2, $3, now())
         RETURNING id, image_url, display_order`,
        [venueId, image_urls[i], i + 1]
      );
      images.push(r.rows[0]);
    }

    res.status(201).json({ message: 'Images uploaded', images });
  } catch (err) {
    next(err);
  }
});

// PUT /api/venues/:id/images/order - Reorder images (SCRUM-117)
router.put(
  '/:id/images/order',
  requireAuthenticated,
  requireRole('OWNER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const venueId = Number(req.params.id);
      const { image_ids } = req.body;

      if (!Array.isArray(image_ids)) {
        return next(
          new AppError('INVALID_FIELD', { details: { field: 'image_ids', reason: 'Array required' } })
        );
      }

      for (let i = 0; i < image_ids.length; i++) {
        await query(`UPDATE venue_image SET display_order = $1 WHERE id = $2 AND venue_id = $3`, [
          i + 1,
          image_ids[i],
          venueId,
        ]);
      }

      res.json({ message: 'Image order updated' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
