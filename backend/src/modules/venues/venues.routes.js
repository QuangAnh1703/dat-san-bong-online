'use strict';
const express = require('express');
const { query } = require('../../db');
const { AppError } = require('../../lib/errors');
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

module.exports = router;
