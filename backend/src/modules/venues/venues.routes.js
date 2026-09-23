'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const router = express.Router();

// GET /api/venues?district=CG&q=my dinh
router.get('/', async (req, res, next) => {
  try {
    const { district, q } = req.query;
    const r = await query(
      `SELECT v.id, v.name, v.address, v.district_code, d.name AS district_name,
              v.phone, v.avg_rating, v.rating_count,
              v.open_time, v.close_time, v.deposit_rate,
              (SELECT count(*) FROM field f WHERE f.venue_id = v.id AND f.is_active) AS field_count,
              (SELECT min(round(pr.base_price * pr.multiplier))
                 FROM price_rule pr WHERE pr.venue_id = v.id) AS min_price,
              COALESCE((SELECT array_agg(a.name ORDER BY a.name)
                 FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code
                WHERE va.venue_id = v.id), '{}') AS amenities
         FROM venue v
         JOIN district d ON d.code = v.district_code
        WHERE v.status = 'APPROVED'
          AND ($1::varchar IS NULL OR v.district_code = $1)
          AND ($2::text IS NULL OR v.name ILIKE '%' || $2 || '%' OR v.address ILIKE '%' || $2 || '%')
        ORDER BY v.avg_rating DESC, v.rating_count DESC`,
      [district || null, q || null]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) { next(e); }
});

// GET /api/venues/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const v = await query(
      `SELECT v.*, d.name AS district_name
         FROM venue v JOIN district d ON d.code = v.district_code
        WHERE v.id = $1`, [id]);
    if (v.rowCount === 0) throw new AppError('VENUE_NOT_FOUND', { details: { id } });

    const fields = await query(
      `SELECT id, name, type, is_active FROM field WHERE venue_id = $1 ORDER BY name`, [id]);
    const amenities = await query(
      `SELECT a.code, a.name FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code
        WHERE va.venue_id = $1 ORDER BY a.name`, [id]);
    const prices = await query(
      `SELECT field_type, day_type,
              lower(time_span) AS from_minute, upper(time_span) AS to_minute,
              base_price, multiplier, label,
              round(base_price * multiplier) AS price_per_hour
         FROM price_rule WHERE venue_id = $1
        ORDER BY field_type, day_type, lower(time_span)`, [id]);

    res.json({ ...v.rows[0], fields: fields.rows, amenities: amenities.rows, price_rules: prices.rows });
  } catch (e) { next(e); }
});

// GET /api/venues/:id/revenue  (dung view co san)
router.get('/:id/revenue', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM v_venue_daily_revenue WHERE venue_id = $1 ORDER BY 2 DESC LIMIT 60`,
      [Number(req.params.id)]);
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) { next(e); }
});

// POST /api/venues - Create venue (SCRUM-115, OWNER/ADMIN only)
router.post('/', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { name, address, district_code, phone, latitude, longitude, open_time, close_time, deposit_rate, amenities } = req.body;
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
      return next(new AppError('INVALID_FIELD', { details: { field: 'coordinates', reason: 'Must be numbers' } }));
    }

    const result = await withTransaction(async (c) => {
      // Create venue
      const v = await c.query(
        `INSERT INTO venue (name, address, district_code, phone, latitude, longitude, open_time, close_time, deposit_rate, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
         RETURNING id, name, address, district_code, phone, latitude, longitude, status, created_at`,
        [name.trim(), address.trim(), district_code, phone, latitude, longitude, open_time || '09:00', close_time || '22:00', deposit_rate || 0]
      );

      const venueId = v.rows[0].id;

      // Add amenities if provided
      if (Array.isArray(amenities) && amenities.length > 0) {
        for (const amenityCode of amenities) {
          await c.query(
            `INSERT INTO venue_amenity (venue_id, amenity_code) VALUES ($1, $2)`,
            [venueId, amenityCode]
          );
        }
      }

      return v.rows[0];
    });

    res.status(201).json({ message: 'Venue created', venue: result });
  } catch (err) { next(err); }
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
        await query(
          `INSERT INTO venue_amenity (venue_id, amenity_code) VALUES ($1, $2)`,
          [venueId, amenityCode]
        );
      }
    }

    res.json({ message: 'Venue updated', venue: result.rows[0] });
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
});

// POST /api/venues/:id/images - Upload venue images (SCRUM-117)
router.post('/:id/images', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { image_urls } = req.body;

    if (!Array.isArray(image_urls) || image_urls.length === 0) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'image_urls', reason: 'Array required' } }));
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
  } catch (err) { next(err); }
});

// PUT /api/venues/:id/images/order - Reorder images (SCRUM-117)
router.put('/:id/images/order', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { image_ids } = req.body;

    if (!Array.isArray(image_ids)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'image_ids', reason: 'Array required' } }));
    }

    for (let i = 0; i < image_ids.length; i++) {
      await query(
        `UPDATE venue_image SET display_order = $1 WHERE id = $2 AND venue_id = $3`,
        [i + 1, image_ids[i], venueId]
      );
    }

    res.json({ message: 'Image order updated' });
  } catch (err) { next(err); }
});

module.exports = router;
