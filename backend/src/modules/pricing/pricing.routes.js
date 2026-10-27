'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields, fromDbError } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const router = express.Router();

// Helper: Convert minute to HH:MM format
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Helper: Convert HH:MM to minutes
const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper: Validate time range
const validateTimeRange = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start < 0 || start >= 1440 || end <= 0 || end > 1440) {
    throw new AppError('INVALID_TIME_RANGE', {
      message: 'Khung giờ phải trong khoảng 00:00 - 24:00',
    });
  }
  if (start >= end) {
    throw new AppError('INVALID_TIME_RANGE', {
      message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc',
    });
  }
  return { start, end };
};

// Sua bang gia: chu san chi duoc sua san cua minh (admin sua moi san)
router.use('/:venueId', async (req, res, next) => {
  if (req.method === 'GET' || !req.user || req.user.role === 'ADMIN') return next();
  try {
    const v = await query(`SELECT owner_id FROM venue WHERE id = $1`, [Number(req.params.venueId)]);
    if (v.rowCount === 0) return next(new AppError('VENUE_NOT_FOUND'));
    if (v.rows[0].owner_id !== req.user.id) return next(new AppError('FORBIDDEN'));
    next();
  } catch (err) {
    next(err);
  }
});

// GET /api/pricing/:venueId - List all pricing rules for venue
router.get('/:venueId', async (req, res, next) => {
  try {
    const venueId = Number(req.params.venueId);
    if (!venueId) throw new AppError('VALIDATION_ERROR', { details: { field: 'venueId' } });

    const rules = await query(
      `SELECT id, venue_id, field_type, day_type,
              lower(time_span) AS from_minute, upper(time_span) AS to_minute,
              base_price, multiplier, label, created_at
         FROM price_rule
        WHERE venue_id = $1
        ORDER BY field_type, day_type, lower(time_span)`,
      [venueId]
    );

    res.json({
      count: rules.rowCount,
      data: rules.rows.map((r) => ({
        ...r,
        from_time: minutesToTime(r.from_minute),
        to_time: minutesToTime(r.to_minute),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/pricing/:venueId/:id - Get single pricing rule
router.get('/:venueId/:id', async (req, res, next) => {
  try {
    const { venueId, id } = req.params;
    if (!venueId || !id) throw new AppError('VALIDATION_ERROR');

    const rule = await query(
      `SELECT id, venue_id, field_type, day_type,
              lower(time_span) AS from_minute, upper(time_span) AS to_minute,
              base_price, multiplier, label, created_at
         FROM price_rule
        WHERE id = $1 AND venue_id = $2`,
      [Number(id), Number(venueId)]
    );

    if (rule.rowCount === 0) throw new AppError('NOT_FOUND', { details: { id } });

    const r = rule.rows[0];
    res.json({
      ...r,
      from_time: minutesToTime(r.from_minute),
      to_time: minutesToTime(r.to_minute),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/pricing/:venueId - Create pricing rule (OWNER/ADMIN)
router.post('/:venueId', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.venueId);
    const { field_type, day_type, from_time, to_time, base_price, multiplier, label } = req.body;

    // Validate required fields
    requireFields(req.body, ['field_type', 'day_type', 'from_time', 'to_time', 'base_price']);

    // Validate time range
    const { start, end } = validateTimeRange(from_time, to_time);

    // Validate prices
    if (typeof base_price !== 'number' || base_price <= 0) {
      throw new AppError('INVALID_FIELD', {
        details: { field: 'base_price', reason: 'Must be positive number' },
      });
    }
    if (multiplier !== undefined && (typeof multiplier !== 'number' || multiplier < 0.1 || multiplier > 5)) {
      throw new AppError('INVALID_FIELD', {
        details: { field: 'multiplier', reason: 'Must be between 0.1 and 5' },
      });
    }

    const result = await withTransaction(async (c) => {
      const rule = await c.query(
        `INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, multiplier, label)
         VALUES ($1, $2, $3, int4range($4, $5), $6, $7, $8)
         RETURNING id, venue_id, field_type, day_type,
                   lower(time_span) AS from_minute, upper(time_span) AS to_minute,
                   base_price, multiplier, label, created_at`,
        [venueId, field_type, day_type, start, end, base_price, multiplier || 1.0, label || null]
      );
      return rule.rows[0];
    });

    res.status(201).json({
      ...result,
      from_time: minutesToTime(result.from_minute),
      to_time: minutesToTime(result.to_minute),
    });
  } catch (err) {
    const dbErr = fromDbError(err);
    // Handle GIST constraint violation (overlapping time slots)
    if (err.code === '23P01') {
      return next(
        new AppError('PRICE_SLOT_OVERLAP', {
          message: `Khung giờ cài đặt giá bị chồng lấp (${req.body?.from_time || '?'}-${req.body?.to_time || '?'}). Vui lòng kiểm tra lại!`,
          details: { from_time: req.body?.from_time, to_time: req.body?.to_time },
          cause: err,
        })
      );
    }
    next(dbErr || err);
  }
});

// PUT /api/pricing/:venueId/:id - Update pricing rule (OWNER/ADMIN)
router.put('/:venueId/:id', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { venueId, id } = req.params;
    const { field_type, day_type, from_time, to_time, base_price, multiplier, label } = req.body;

    // At least one field must be provided
    if (
      !field_type &&
      !day_type &&
      !from_time &&
      !to_time &&
      !base_price &&
      multiplier === undefined &&
      label === undefined
    ) {
      throw new AppError('VALIDATION_ERROR', { message: 'No fields to update' });
    }

    // Validate time range if provided
    let start, end;
    if (from_time || to_time) {
      const fromT =
        from_time ||
        (await query(`SELECT lower(time_span) as from_minute FROM price_rule WHERE id = $1`, [Number(id)]))
          .rows[0]?.from_minute;
      const toT =
        to_time ||
        (await query(`SELECT upper(time_span) as to_minute FROM price_rule WHERE id = $1`, [Number(id)]))
          .rows[0]?.to_minute;

      ({ start, end } = validateTimeRange(minutesToTime(fromT), minutesToTime(toT)));
    }

    // Validate prices if provided
    if (base_price !== undefined && (typeof base_price !== 'number' || base_price <= 0)) {
      throw new AppError('INVALID_FIELD', {
        details: { field: 'base_price', reason: 'Must be positive number' },
      });
    }
    if (multiplier !== undefined && (typeof multiplier !== 'number' || multiplier < 0.1 || multiplier > 5)) {
      throw new AppError('INVALID_FIELD', {
        details: { field: 'multiplier', reason: 'Must be between 0.1 and 5' },
      });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (field_type) {
      updates.push(`field_type = $${paramIndex++}`);
      values.push(field_type);
    }
    if (day_type) {
      updates.push(`day_type = $${paramIndex++}`);
      values.push(day_type);
    }
    if (from_time || to_time) {
      updates.push(`time_span = int4range($${paramIndex++}, $${paramIndex++})`);
      values.push(start, end);
    }
    if (base_price !== undefined) {
      updates.push(`base_price = $${paramIndex++}`);
      values.push(base_price);
    }
    if (multiplier !== undefined) {
      updates.push(`multiplier = $${paramIndex++}`);
      values.push(multiplier);
    }
    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label);
    }

    values.push(Number(id), Number(venueId));

    const result = await withTransaction(async (c) => {
      const rule = await c.query(
        `UPDATE price_rule
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex + 1} AND venue_id = $${paramIndex + 2}
         RETURNING id, venue_id, field_type, day_type,
                   lower(time_span) AS from_minute, upper(time_span) AS to_minute,
                   base_price, multiplier, label, created_at`,
        values
      );
      if (rule.rowCount === 0) throw new AppError('NOT_FOUND', { details: { id } });
      return rule.rows[0];
    });

    res.json({
      ...result,
      from_time: minutesToTime(result.from_minute),
      to_time: minutesToTime(result.to_minute),
    });
  } catch (err) {
    // Handle GIST constraint violation
    if (err.code === '23P01') {
      return next(
        new AppError('PRICE_SLOT_OVERLAP', {
          message: `Khung giờ cài đặt giá bị chồng lấp (${req.body?.from_time || '?'}-${req.body?.to_time || '?'}). Vui lòng kiểm tra lại!`,
          details: { from_time: req.body?.from_time, to_time: req.body?.to_time },
          cause: err,
        })
      );
    }
    const dbErr = fromDbError(err);
    next(dbErr || err);
  }
});

// DELETE /api/pricing/:venueId/:id - Delete pricing rule (OWNER/ADMIN)
router.delete(
  '/:venueId/:id',
  requireAuthenticated,
  requireRole('OWNER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { venueId, id } = req.params;

      const result = await withTransaction(async (c) => {
        const deleted = await c.query(`DELETE FROM price_rule WHERE id = $1 AND venue_id = $2 RETURNING id`, [
          Number(id),
          Number(venueId),
        ]);
        if (deleted.rowCount === 0) throw new AppError('NOT_FOUND', { details: { id } });
        return deleted.rows[0];
      });

      res.json({ success: true, id: result.id });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
