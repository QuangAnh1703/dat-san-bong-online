'use strict';
const express = require('express');
const { query } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const router = express.Router();

// GET /api/fields/:id/schedule?date=2026-09-10
// Lich san trong ngay, lay tu view v_field_schedule
router.get('/:id/schedule', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const r = await query(
      `SELECT * FROM v_field_schedule
        WHERE field_id = $1 AND play_date = $2::date
        ORDER BY start_at`, [id, date]);
    res.json({ field_id: id, play_date: date, count: r.rowCount, slots: r.rows });
  } catch (e) { next(e); }
});

// GET /api/fields/:id/availability?date=2026-09-10&start=18:00&end=19:30
router.get('/:id/availability', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { date, start, end } = req.query;
    requireFields(req.query, ['date', 'start', 'end']);
    const r = await query(
      `SELECT fn_is_slot_available($1, tstzrange(($2 || ' ' || $3)::timestamptz,
                                                 ($2 || ' ' || $4)::timestamptz, '[)')) AS available`,
      [id, date, start, end]);
    res.json({ field_id: id, date, start, end, available: r.rows[0].available });
  } catch (e) { next(e); }
});

module.exports = router;
