'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { sendVenueRejectionNotification, sendVenueApprovalNotification } = require('./notification.service');

const router = express.Router();

// =====================================================================
// SCRUM-119: Admin duyệt và từ chối cụm sân
// =====================================================================

// GET /api/admin/venues/pending - Danh sách cụm sân chờ duyệt (ADMIN only)
router.get('/venues/pending', requireAuthenticated, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const r = await query(
      `SELECT v.id, v.owner_id, v.name, v.address, v.district_code, d.name AS district_name,
              v.phone, v.deposit_rate, v.created_at,
              u.full_name AS owner_name, u.email AS owner_email,
              (SELECT count(*) FROM field f WHERE f.venue_id = v.id AND f.is_active) AS field_count,
              (SELECT count(*) FROM venue_approval va WHERE va.venue_id = v.id) AS approval_count
         FROM venue v
         JOIN app_user u ON u.id = v.owner_id
         JOIN district d ON d.code = v.district_code
        WHERE v.status = 'PENDING'
        ORDER BY v.created_at ASC
        LIMIT $1 OFFSET $2`,
      [Number(limit), offset]
    );

    const totalRes = await query(`SELECT count(*) AS total FROM venue WHERE status = 'PENDING'`);
    const total = totalRes.rows[0].total;

    res.json({
      count: r.rowCount,
      total,
      page: Number(page),
      limit: Number(limit),
      data: r.rows,
    });
  } catch (e) { next(e); }
});

// GET /api/admin/venues/:id/approval-history - Lịch sử duyệt của cụm sân
router.get('/venues/:id/approval-history', requireAuthenticated, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);

    const r = await query(
      `SELECT va.id, va.action, va.reason, va.created_at,
              u.full_name AS admin_name, u.email AS admin_email
         FROM venue_approval va
         LEFT JOIN app_user u ON u.id = va.admin_id
        WHERE va.venue_id = $1
        ORDER BY va.created_at DESC`,
      [venueId]
    );

    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) { next(e); }
});

// POST /api/admin/venues/:id/approve - Phê duyệt cụm sân
router.post('/venues/:id/approve', requireAuthenticated, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const adminId = req.user.id;

    const result = await withTransaction(async (c) => {
      // Check venue exists and is in PENDING status
      const vRes = await c.query(
        `SELECT id, status, owner_id FROM venue WHERE id = $1`,
        [venueId]
      );

      if (vRes.rowCount === 0) {
        throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
      }

      const venue = vRes.rows[0];
      if (venue.status !== 'PENDING') {
        throw new AppError('INVALID_VENUE_STATUS', {
          details: { current: venue.status, expected: 'PENDING' },
        });
      }

      // Update venue status to APPROVED
      await c.query(
        `UPDATE venue SET status = 'APPROVED', updated_at = now() WHERE id = $1`,
        [venueId]
      );

      // Record approval action
      await c.query(
        `INSERT INTO venue_approval (venue_id, admin_id, action, created_at)
         VALUES ($1, $2, 'APPROVE', now())`,
        [venueId, adminId]
      );

      // Send approval notification to venue owner
      await sendVenueApprovalNotification(c, venue.owner_id, venueId);

      return { venue_id: venueId, status: 'APPROVED' };
    });

    res.json({ message: 'Venue approved successfully', result });
  } catch (e) { next(e); }
});

// POST /api/admin/venues/:id/reject - Từ chối cụm sân (SCRUM-119 + SCRUM-120)
router.post('/venues/:id/reject', requireAuthenticated, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const { reason } = req.body;
    const adminId = req.user.id;

    requireFields(req.body, ['reason']);

    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'reason', reason: 'Cannot be empty' },
      }));
    }

    if (reason.length > 500) {
      return next(new AppError('INVALID_FIELD', {
        details: { field: 'reason', reason: 'Max 500 characters' },
      }));
    }

    const result = await withTransaction(async (c) => {
      // Check venue exists and is in PENDING status
      const vRes = await c.query(
        `SELECT id, status, owner_id FROM venue WHERE id = $1`,
        [venueId]
      );

      if (vRes.rowCount === 0) {
        throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
      }

      const venue = vRes.rows[0];
      if (venue.status !== 'PENDING') {
        throw new AppError('INVALID_VENUE_STATUS', {
          details: { current: venue.status, expected: 'PENDING' },
        });
      }

      // Update venue status to REJECTED
      await c.query(
        `UPDATE venue SET status = 'REJECTED', updated_at = now() WHERE id = $1`,
        [venueId]
      );

      // Record rejection action with reason
      await c.query(
        `INSERT INTO venue_approval (venue_id, admin_id, action, reason, created_at)
         VALUES ($1, $2, 'REJECT', $3, now())`,
        [venueId, adminId, reason.trim()]
      );

      // SCRUM-120: Send notification to venue owner
      await sendVenueRejectionNotification(c, venue.owner_id, venueId, reason.trim());

      return { venue_id: venueId, status: 'REJECTED', reason: reason.trim() };
    });

    res.json({ message: 'Venue rejected successfully', result });
  } catch (e) { next(e); }
});

// POST /api/admin/venues/:id/resubmit - Cho phép chủ sân tải lại hồ sơ sau khi từ chối
router.post('/venues/:id/resubmit', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const venueId = Number(req.params.id);
    const userId = req.user.id;

    const result = await withTransaction(async (c) => {
      // Check venue exists
      const vRes = await c.query(
        `SELECT id, status, owner_id FROM venue WHERE id = $1`,
        [venueId]
      );

      if (vRes.rowCount === 0) {
        throw new AppError('VENUE_NOT_FOUND', { details: { id: venueId } });
      }

      const venue = vRes.rows[0];

      // Only OWNER can resubmit their own venue, ADMIN can resubmit any
      if (req.user.role === 'OWNER' && venue.owner_id !== userId) {
        throw new AppError('FORBIDDEN', { details: { reason: 'Not venue owner' } });
      }

      // Can only resubmit if REJECTED or DRAFT
      if (!['REJECTED', 'DRAFT'].includes(venue.status)) {
        throw new AppError('INVALID_VENUE_STATUS', {
          details: { current: venue.status, expected: 'REJECTED or DRAFT' },
        });
      }

      // Update venue status back to PENDING
      await c.query(
        `UPDATE venue SET status = 'PENDING', updated_at = now() WHERE id = $1`,
        [venueId]
      );

      // Record resubmit action
      await c.query(
        `INSERT INTO venue_approval (venue_id, admin_id, action, created_at)
         VALUES ($1, $2, 'SUBMIT', now())`,
        [venueId, userId]
      );

      return { venue_id: venueId, status: 'PENDING' };
    });

    res.json({ message: 'Venue resubmitted successfully', result });
  } catch (e) { next(e); }
});

module.exports = router;
