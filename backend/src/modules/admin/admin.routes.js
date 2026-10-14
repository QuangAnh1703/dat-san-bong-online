'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
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
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
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
    await query(`INSERT INTO venue_rejection_log (venue_id, reason, created_at) VALUES ($1, $2, now())`, [
      venueId,
      reason.trim(),
    ]);

    res.json({ message: 'Venue rejected', venue: r.rows[0] });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
});

// ===== Owner Request Management =====

// GET /api/admin/owner-requests - List pending owner upgrade requests
router.get('/owner-requests', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) as total FROM owner_request WHERE status = 'PENDING'`);

    const r = await query(
      `SELECT
         orq.id, orq.user_id, orq.status, orq.requested_at,
         u.email, u.phone,
         p.full_name, p.district_code
       FROM owner_request orq
       JOIN app_user u ON u.id = orq.user_id
       LEFT JOIN user_profile p ON p.user_id = u.id
       WHERE orq.status = 'PENDING'
       ORDER BY orq.requested_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      total: countResult.rows[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
      count: r.rowCount,
      data: r.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/owner-requests/:id/approve - Approve owner request
router.post('/owner-requests/:id/approve', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;

    // Get the request
    const reqResult = await query(`SELECT * FROM owner_request WHERE id = $1`, [requestId]);

    if (reqResult.rowCount === 0) {
      throw new AppError('OWNER_REQUEST_NOT_FOUND');
    }

    const ownerReq = reqResult.rows[0];

    if (ownerReq.status !== 'PENDING') {
      throw new AppError('OWNER_REQUEST_NOT_PENDING', {
        details: { current_status: ownerReq.status },
      });
    }

    // Update user role and request status in transaction
    await query('BEGIN');
    try {
      await query(`UPDATE app_user SET role = 'OWNER' WHERE id = $1`, [ownerReq.user_id]);

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
        request: updated.rows[0],
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/owner-requests/:id/reject - Reject owner request
router.post('/owner-requests/:id/reject', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0 || reason.length > 500) {
      return next(
        new AppError('INVALID_FIELD', {
          details: { field: 'reason', reason: 'Required, max 500 chars' },
        })
      );
    }

    const reqResult = await query(`SELECT * FROM owner_request WHERE id = $1`, [requestId]);

    if (reqResult.rowCount === 0) {
      throw new AppError('OWNER_REQUEST_NOT_FOUND');
    }

    const ownerReq = reqResult.rows[0];

    if (ownerReq.status !== 'PENDING') {
      throw new AppError('OWNER_REQUEST_NOT_PENDING', {
        details: { current_status: ownerReq.status },
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
      request: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    params.push(limit);
    params.push(offset);

    const countResult = await query(`SELECT COUNT(*) as total FROM app_user u ${whereClause}`);

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
      data: r.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/role - Change user role (admin only)
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const validRoles = ['PLAYER', 'OWNER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return next(
        new AppError('INVALID_FIELD', {
          details: { field: 'role', reason: `Must be one of: ${validRoles.join(', ')}` },
        })
      );
    }

    const r = await query(`UPDATE app_user SET role = $1, updated_at = now() WHERE id = $2 RETURNING *`, [
      role,
      userId,
    ]);

    if (r.rowCount === 0) {
      throw new AppError('USER_NOT_FOUND');
    }

    res.json({
      message: 'User role updated',
      user: {
        id: r.rows[0].id,
        email: r.rows[0].email,
        role: r.rows[0].role,
        status: r.rows[0].status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/status  body: { status: ACTIVE | LOCKED }
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body || {};
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'status', reason: 'ACTIVE | LOCKED' } });
    }
    if (userId === req.user.id) {
      throw new AppError('INVALID_OPERATION', { message: 'Khong the tu khoa tai khoan cua minh' });
    }
    const r = await query(`UPDATE app_user SET status = $1 WHERE id = $2 RETURNING id, status`, [
      status,
      userId,
    ]);
    if (r.rowCount === 0) throw new AppError('USER_NOT_FOUND');
    res.json({ message: 'User status updated', user: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ===== Khieu nai & hoan coc (UC-30) =====

// GET /api/admin/complaints?status=NEW,IN_PROGRESS
router.get('/complaints', async (req, res, next) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(',') : null;
    const r = await query(
      `SELECT ct.id, ct.code, ct.status, ct.subject, ct.content, ct.resolution, ct.created_at, ct.closed_at,
              b.code AS booking_code, b.status AS booking_status, b.deposit_amount,
              v.name AS venue_name,
              p.full_name AS reporter_name, u.phone AS reporter_phone,
              (SELECT COALESCE(sum(pm.amount), 0) FROM payment pm
                WHERE pm.booking_id = b.id AND pm.status = 'SUCCESS') AS paid_amount
         FROM complaint_ticket ct
         JOIN app_user u ON u.id = ct.reporter_id
         LEFT JOIN user_profile p ON p.user_id = ct.reporter_id
         LEFT JOIN booking b ON b.id = ct.booking_id
         LEFT JOIN venue v ON v.id = b.venue_id
        WHERE $1::text[] IS NULL OR ct.status::text = ANY($1)
        ORDER BY ct.created_at DESC
        LIMIT 100`,
      [statuses]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/complaints/:id/resolve  body: { outcome: REFUND | REJECT, resolution }
// REFUND: hoan 100% cac khoan coc da thanh toan, don chuyen sang REFUNDED va nha slot
router.post('/complaints/:id/resolve', async (req, res, next) => {
  const { outcome, resolution } = req.body || {};
  try {
    requireFields(req.body, ['outcome', 'resolution']);
    if (!['REFUND', 'REJECT'].includes(outcome)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'outcome', reason: 'REFUND | REJECT' } });
    }

    const out = await withTransaction(async (c) => {
      const t = await c.query(`SELECT * FROM complaint_ticket WHERE id = $1 FOR UPDATE`, [
        Number(req.params.id),
      ]);
      if (t.rowCount === 0) throw new AppError('TICKET_NOT_FOUND');
      const ticket = t.rows[0];
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        throw new AppError('INVALID_STATUS', { details: { status: ticket.status } });
      }

      let refunded = 0;
      if (outcome === 'REFUND' && ticket.booking_id) {
        const pays = await c.query(
          `SELECT id, amount FROM payment WHERE booking_id = $1 AND status = 'SUCCESS' FOR UPDATE`,
          [ticket.booking_id]
        );
        for (const pm of pays.rows) {
          await c.query(
            `INSERT INTO refund (payment_id, amount, refund_percent, reason, status, approved_by, completed_at)
             VALUES ($1, $2, 100, $3, 'SUCCESS', $4, now())`,
            [pm.id, pm.amount, String(resolution).slice(0, 300), req.user.id]
          );
          await c.query(`UPDATE payment SET status = 'REFUNDED' WHERE id = $1`, [pm.id]);
          refunded += Number(pm.amount);
        }
        await c.query(
          `UPDATE booking SET status = 'REFUNDED', cancelled_at = COALESCE(cancelled_at, now()),
                              hold_expires_at = NULL
            WHERE id = $1`,
          [ticket.booking_id]
        );
        await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [
          ticket.booking_id,
        ]);
      }

      const r = await c.query(
        `UPDATE complaint_ticket SET status = 'RESOLVED', resolution = $2, assigned_admin_id = $3, closed_at = now()
          WHERE id = $1 RETURNING id, code, status, resolution, closed_at`,
        [ticket.id, `${outcome === 'REFUND' ? '[HOAN COC] ' : '[TU CHOI] '}${resolution}`, req.user.id]
      );
      return { ...r.rows[0], refunded_amount: refunded };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// ===== Bao cao he thong =====

// GET /api/admin/reports - So lieu thang nay + ty le lap day theo khung gio (30 ngay gan nhat)
router.get('/reports', async (req, res, next) => {
  try {
    const month = await query(
      `SELECT
         count(*) FILTER (WHERE kind <> 'OWNER_LOCK') AS bookings,
         count(*) FILTER (WHERE kind <> 'OWNER_LOCK' AND status::text LIKE 'CANCELLED%') AS cancelled,
         COALESCE(sum(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')), 0) AS gmv,
         (SELECT count(*) FROM match_post WHERE status = 'MATCHED'
             AND created_at >= date_trunc('month', now())) AS matched_posts,
         (SELECT count(*) FROM complaint_ticket WHERE status NOT IN ('RESOLVED', 'CLOSED')) AS open_complaints
         FROM booking
        WHERE created_at >= date_trunc('month', now())`
    );

    // Lap day = so phut da ban trong khung / (so san dang mo * 30 ngay * do dai khung)
    const bands = await query(
      `WITH band(label, from_min, to_min) AS (
         VALUES ('06:00 - 11:00', 360, 660), ('11:00 - 15:00', 660, 900), ('15:00 - 17:30', 900, 1050),
                ('17:30 - 21:00', 1050, 1260), ('21:00 - 24:00', 1260, 1440)
       ), used AS (
         SELECT (extract(hour FROM lower(s.time_range)) * 60 + extract(minute FROM lower(s.time_range)))::int AS s_min,
                (extract(epoch FROM upper(s.time_range) - lower(s.time_range)) / 60)::int AS dur
           FROM booking_slot s
          WHERE s.status IN ('CONFIRMED', 'LOCKED')
            AND s.play_date BETWEEN current_date - 29 AND current_date
       ), fields AS (
         SELECT count(*) AS n FROM field f JOIN venue v ON v.id = f.venue_id
          WHERE f.is_active AND v.status = 'APPROVED'
       )
       SELECT b.label,
              COALESCE(sum(GREATEST(0, LEAST(u.s_min + u.dur, b.to_min) - GREATEST(u.s_min, b.from_min))), 0) AS used_min,
              (SELECT n FROM fields) * 30 * (b.to_min - b.from_min) AS capacity_min
         FROM band b LEFT JOIN used u ON TRUE
        GROUP BY b.label, b.from_min, b.to_min
        ORDER BY b.from_min`
    );

    res.json({
      month: month.rows[0],
      occupancy: bands.rows.map((r) => ({
        label: r.label,
        used_minutes: Number(r.used_min),
        capacity_minutes: Number(r.capacity_min),
        rate: r.capacity_min > 0 ? Math.round((Number(r.used_min) / Number(r.capacity_min)) * 1000) / 10 : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
