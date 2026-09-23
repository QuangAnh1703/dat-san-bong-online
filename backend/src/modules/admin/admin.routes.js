'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');

const router = express.Router();
router.use(requireAuthenticated, requireRole('ADMIN'));

// GET /api/admin/venues/pending - List pending venues (SCRUM-118)
router.get('/venues/pending', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const r = await query(
      `SELECT v.id, v.name, v.address, v.district_code, d.name AS district_name,
              v.phone, v.created_at, v.status
         FROM venue v
         JOIN district d ON d.code = v.district_code
        WHERE v.status = 'PENDING'
        ORDER BY v.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) { next(err); }
});

// POST /api/admin/venues/:id/approve - Approve venue (SCRUM-119)
router.post('/venues/:id/approve', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const r = await query(
      `UPDATE venue SET status = 'APPROVED', updated_at = now()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [venueId]
    );

    if (r.rowCount === 0) throw new AppError('VENUE_NOT_FOUND_OR_NOT_PENDING');
    res.json({ message: 'Venue approved', venue: r.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/admin/venues/:id/reject - Reject venue (SCRUM-119, SCRUM-120)
router.post('/venues/:id/reject', async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0 || reason.length > 500) {
      return next(new AppError('INVALID_FIELD', { details: { field: 'reason' } }));
    }

    const r = await query(
      `UPDATE venue SET status = 'REJECTED', updated_at = now()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [venueId]
    );

    if (r.rowCount === 0) throw new AppError('VENUE_NOT_FOUND_OR_NOT_PENDING');
    
    // Store rejection reason (SCRUM-120)
    await query(
      `INSERT INTO venue_rejection_log (venue_id, reason, created_at) VALUES ($1, $2, now())`,
      [venueId, reason.trim()]
    );

    res.json({ message: 'Venue rejected', venue: r.rows[0] });
  } catch (err) { next(err); }
});

// GET /api/admin/stats - Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
         (SELECT COUNT(*) FROM venue) as total_venues,
         (SELECT COUNT(*) FROM venue WHERE status = 'PENDING') as pending_venues,
         (SELECT COUNT(*) FROM venue WHERE status = 'APPROVED') as approved_venues,
         (SELECT COUNT(*) FROM app_user) as total_users,
         (SELECT COUNT(*) FROM booking) as total_bookings`
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
