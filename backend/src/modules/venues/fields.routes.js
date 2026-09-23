'use strict';
const express = require('express');
const { query } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
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

// POST /api/fields - Create field (SCRUM-116, OWNER/ADMIN only)
router.post('/', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { venue_id, name, type } = req.body;
    requireFields(req.body, ['venue_id', 'name', 'type']);

    // Validation
    const validTypes = ['F5', 'F7', 'F11'];
    if (!validTypes.includes(type)) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'type', reason: `Must be one of: ${validTypes.join(', ')}` }
      }));
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 120) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'name', reason: 'Max 120 chars' } }));
    }

    const result = await query(
      `INSERT INTO field (venue_id, name, type, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, venue_id, name, type, is_active, created_at`,
      [venue_id, name.trim(), type]
    );

    res.status(201).json({ message: 'Field created', field: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/fields/:id - Update field (SCRUM-116)
router.put('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const fieldId = Number(req.params.id);
    const { name, type, is_active } = req.body;

    // Validation
    if (type !== undefined) {
      const validTypes = ['F5', 'F7', 'F11'];
      if (!validTypes.includes(type)) {
        return next(new AppError('INVALID_FIELD', {
          details: { field: 'type', reason: `Must be one of: ${validTypes.join(', ')}` }
        }));
      }
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 120)) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'name', reason: 'Max 120 chars' } }));
    }

    const updates = ['updated_at = now()'];
    const values = [fieldId];
    let paramCount = 2;

    if (name !== undefined) {
      updates.unshift(`name = $${paramCount}`);
      values.push(name.trim());
      paramCount++;
    }
    if (type !== undefined) {
      updates.unshift(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }
    if (is_active !== undefined) {
      updates.unshift(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    const updateQuery = `UPDATE field SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await query(updateQuery, values);

    if (result.rowCount === 0) {
      return next(new AppError('FIELD_NOT_FOUND'));
    }

    res.json({ message: 'Field updated', field: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/fields/:id - Delete field (SCRUM-116)
router.delete('/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const fieldId = Number(req.params.id);

    // Delete field and related slots
    const result = await query(
      `DELETE FROM field WHERE id = $1 RETURNING id`,
      [fieldId]
    );

    if (result.rowCount === 0) {
      return next(new AppError('FIELD_NOT_FOUND'));
    }

    res.json({ message: 'Field deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
