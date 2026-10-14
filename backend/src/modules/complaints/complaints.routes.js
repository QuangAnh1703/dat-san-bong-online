'use strict';
const express = require('express');
const { query } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const router = express.Router();

router.use(requireAuthenticated);

// POST /api/complaints  body: { booking_code, subject, content }
router.post('/', async (req, res, next) => {
  const { booking_code, subject, content } = req.body || {};
  try {
    requireFields(req.body, ['booking_code', 'subject', 'content']);
    if (String(subject).length > 200 || String(content).length > 2000) {
      throw new AppError('INVALID_FIELD', { details: { reason: 'subject <= 200, content <= 2000 ky tu' } });
    }

    const b = await query(`SELECT id, user_id FROM booking WHERE code = $1`, [booking_code]);
    if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code: booking_code } });
    if (b.rows[0].user_id !== req.user.id) throw new AppError('FORBIDDEN');

    const code = `TK-${Date.now().toString(36).toUpperCase()}`;
    const r = await query(
      `INSERT INTO complaint_ticket (code, reporter_id, target_kind, target_id, booking_id, subject, content)
       VALUES ($1, $2, 'BOOKING', $3, $3, $4, $5)
       RETURNING id, code, status, subject, created_at`,
      [code, req.user.id, b.rows[0].id, subject, content]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/me - Khieu nai cua toi
router.get('/me', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ct.id, ct.code, ct.status, ct.subject, ct.resolution, ct.created_at, ct.closed_at,
              b.code AS booking_code
         FROM complaint_ticket ct LEFT JOIN booking b ON b.id = ct.booking_id
        WHERE ct.reporter_id = $1 ORDER BY ct.created_at DESC`,
      [req.user.id]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
