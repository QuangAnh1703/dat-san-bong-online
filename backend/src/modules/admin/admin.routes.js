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

// ===== Owner Request Management =====

// GET /api/admin/owner-requests - List pending owner upgrade requests
router.get('/owner-requests', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM owner_request WHERE status = 'PENDING'`
    );

    const r = await query(
      `SELECT
         or.id, or.user_id, or.status, or.requested_at,
         u.email, u.phone,
         p.full_name, p.district_code
       FROM owner_request or
       JOIN app_user u ON u.id = or.user_id
       LEFT JOIN user_profile p ON p.user_id = u.id
       WHERE or.status = 'PENDING'
       ORDER BY or.requested_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      total: countResult.rows[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
      count: r.rowCount,
      data: r.rows
    });
  } catch (err) { next(err); }
});

// POST /api/admin/owner-requests/:id/approve - Approve owner request
router.post('/owner-requests/:id/approve', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;

    // Get the request
    const reqResult = await query(
      `SELECT * FROM owner_request WHERE id = $1`,
      [requestId]
    );

    if (reqResult.rowCount === 0) {
      throw new AppError('OWNER_REQUEST_NOT_FOUND');
    }

    const ownerReq = reqResult.rows[0];

    if (ownerReq.status !== 'PENDING') {
      throw new AppError('OWNER_REQUEST_NOT_PENDING', {
        details: { current_status: ownerReq.status }
      });
    }

    // Update user role and request status in transaction
    await query('BEGIN');
    try {
      await query(
        `UPDATE app_user SET role = 'OWNER' WHERE id = $1`,
        [ownerReq.user_id]
      );

      const updated = await query(
        `UPDATE owner_request
         SET status = 'APPROVED', reviewed_at = now(), reviewed_by = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [adminId, requestId]
      );

      await query('COMMIT');

      res.json({
        message: 'Owner request approved',
        request: updated.rows[0]
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) { next(err); }
});

// POST /api/admin/owner-requests/:id/reject - Reject owner request
router.post('/owner-requests/:id/reject', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0 || reason.length > 500) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'reason', reason: 'Required, max 500 chars' }
      }));
    }

    const reqResult = await query(
      `SELECT * FROM owner_request WHERE id = $1`,
      [requestId]
    );

    if (reqResult.rowCount === 0) {
      throw new AppError('OWNER_REQUEST_NOT_FOUND');
    }

    const ownerReq = reqResult.rows[0];

    if (ownerReq.status !== 'PENDING') {
      throw new AppError('OWNER_REQUEST_NOT_PENDING', {
        details: { current_status: ownerReq.status }
      });
    }

    const updated = await query(
      `UPDATE owner_request
       SET status = 'REJECTED', rejection_reason = $1,
           reviewed_at = now(), reviewed_by = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [reason.trim(), adminId, requestId]
    );

    res.json({
      message: 'Owner request rejected',
      request: updated.rows[0]
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users - List all users with pagination and filtering
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    params.push(limit);
    params.push(offset);

    const countResult = await query(
      `SELECT COUNT(*) as total FROM app_user u ${whereClause}`
    );

    const r = await query(
      `SELECT u.id, u.email, u.phone, u.role, u.status, u.created_at,
              p.full_name, p.district_code, p.reputation_score
       FROM app_user u
       LEFT JOIN user_profile p ON p.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      total: countResult.rows[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
      count: r.rowCount,
      data: r.rows
    });
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/role - Change user role (admin only)
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const validRoles = ['PLAYER', 'OWNER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'role', reason: `Must be one of: ${validRoles.join(', ')}` }
      }));
    }

    const r = await query(
      `UPDATE app_user SET role = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [role, userId]
    );

    if (r.rowCount === 0) {
      throw new AppError('USER_NOT_FOUND');
    }

    res.json({
      message: 'User role updated',
      user: {
        id: r.rows[0].id,
        email: r.rows[0].email,
        role: r.rows[0].role,
        status: r.rows[0].status
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
