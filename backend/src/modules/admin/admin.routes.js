'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { freezeOwnerWallets } = require('../../services/wallet.service');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { sendVenueApprovalNotification, sendVenueRejectionNotification } = require('./notification.service');
const { MAX_DIRECT_DAYS, parseRange, buildReport, venueBreakdown, toCsv } = require('../../services/report.service');
const { sendMailWithAttachment } = require('../../services/email.service');

const router = express.Router();
router.use(requireAuthenticated, requireRole('ADMIN'));

// GET /api/admin/venues/pending - List pending venues (SCRUM-118)
router.get('/venues/pending', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const r = await query(
      `SELECT v.id, v.name, v.address, v.district_code, d.name AS district_name,
              v.phone, v.created_at, v.status, v.open_time, v.close_time, v.deposit_rate,
              v.bank_name, v.bank_account, v.bank_holder, v.description,
              op.full_name AS owner_name, ou.phone AS owner_phone, ou.email AS owner_email,
              COALESCE((SELECT json_agg(json_build_object('name', f.name, 'type', f.type) ORDER BY f.name)
                          FROM field f WHERE f.venue_id = v.id), '[]') AS fields,
              COALESCE((SELECT array_agg(a.name ORDER BY a.name) FROM venue_amenity va
                          JOIN amenity a ON a.code = va.amenity_code WHERE va.venue_id = v.id), '{}') AS amenities
         FROM venue v
         JOIN district d ON d.code = v.district_code
         JOIN app_user ou ON ou.id = v.owner_id
         LEFT JOIN user_profile op ON op.user_id = v.owner_id
        WHERE v.status = 'PENDING'
        ORDER BY v.created_at DESC
        LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
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
    const venue = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE venue SET status = 'APPROVED', updated_at = now()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [venueId]
      );
      if (r.rowCount === 0) throw new AppError('VENUE_NOT_FOUND_OR_NOT_PENDING');
      await c.query(`INSERT INTO venue_approval (venue_id, admin_id, action) VALUES ($1, $2, 'APPROVE')`, [
        venueId,
        req.user.id,
      ]);
      await sendVenueApprovalNotification(c, r.rows[0].owner_id, venueId);
      return r.rows[0];
    });
    res.json({ message: 'Venue approved', venue });
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

    const venue = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE venue SET status = 'REJECTED', updated_at = now()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [venueId]
      );
      if (r.rowCount === 0) throw new AppError('VENUE_NOT_FOUND_OR_NOT_PENDING');
      await c.query(
        `INSERT INTO venue_approval (venue_id, admin_id, action, reason) VALUES ($1, $2, 'REJECT', $3)`,
        [venueId, req.user.id, reason.trim()]
      );
      await sendVenueRejectionNotification(c, r.rows[0].owner_id, venueId, reason.trim());
      return r.rows[0];
    });

    res.json({ message: 'Venue rejected', venue });
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

    // query() lay ket noi bat ky trong pool nen BEGIN/COMMIT rieng le khong tao duoc giao dich
    const updated = await withTransaction(async (c) => {
      const u = await c.query(
        `UPDATE owner_request
         SET status = 'APPROVED', reviewed_at = now(), reviewed_by = $1, updated_at = now()
         WHERE id = $2 AND status = 'PENDING'
         RETURNING *`,
        [adminId, requestId]
      );
      if (u.rowCount === 0) throw new AppError('OWNER_REQUEST_NOT_PENDING');
      await c.query(`UPDATE app_user SET role = 'OWNER', updated_at = now() WHERE id = $1`, [ownerReq.user_id]);
      await c.query(
        `INSERT INTO notification (user_id, type, title, body)
         VALUES ($1, 'OWNER_REQUEST_APPROVED', 'Yêu cầu làm chủ sân đã được duyệt',
                 'Đăng nhập lại để vào Góc Chủ Sân và đăng ký cụm sân của bạn.')`,
        [ownerReq.user_id]
      );
      return u.rows[0];
    });

    res.json({
      message: 'Owner request approved',
      request: updated,
    });
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

    const countResult = await query(`SELECT COUNT(*) as total FROM app_user u ${whereClause}`, params.slice(0, -2));

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

// Khoa tai khoan trong giao dich `c`. Chu san con don chua dien ra: confirm = false -> nem
// OWNER_HAS_UPCOMING_BOOKINGS kem so don; confirm = true -> huy cac don do va bao cho nguoi dat.
async function lockUser(c, userId, confirm) {
  const u = await c.query(`SELECT id, role FROM app_user WHERE id = $1 FOR UPDATE`, [userId]);
  if (u.rowCount === 0) throw new AppError('USER_NOT_FOUND');

  let cancelled = 0;
  if (u.rows[0].role === 'OWNER') {
    const upcoming = await c.query(
      `SELECT b.id, b.code, b.user_id, v.name AS venue_name
         FROM booking b JOIN venue v ON v.id = b.venue_id
        WHERE v.owner_id = $1 AND b.kind <> 'OWNER_LOCK'
          AND b.status IN ('HELD', 'PENDING_VERIFY', 'CONFIRMED')
          AND EXISTS (SELECT 1 FROM booking_slot s WHERE s.booking_id = b.id AND lower(s.time_range) > now())
        FOR UPDATE OF b`,
      [userId]
    );
    if (upcoming.rowCount && !confirm) {
      throw new AppError('OWNER_HAS_UPCOMING_BOOKINGS', {
        message: `Chủ sân này đang có ${upcoming.rowCount} đơn đặt chưa diễn ra. Khóa sẽ hủy các đơn và gửi thông báo đến người chơi.`,
        details: { count: upcoming.rowCount },
      });
    }
    for (const b of upcoming.rows) {
      await c.query(
        `UPDATE booking SET status = 'CANCELLED_BY_OWNER', cancelled_at = now(), hold_expires_at = NULL,
                            cancel_reason = 'Tài khoản chủ sân bị khóa'
          WHERE id = $1`,
        [b.id]
      );
      await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [b.id]);
      await c.query(`UPDATE match_post SET status = 'CLOSED', closed_at = now() WHERE booking_id = $1 AND status = 'OPEN'`, [
        b.id,
      ]);
      await c.query(
        `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id)
         VALUES ($1, 'BOOKING_CANCELLED', $2, $3, 'BOOKING', $4)`,
        [
          b.user_id,
          `Đơn ${b.code} đã bị hủy`,
          `Cụm sân ${b.venue_name} tạm ngưng hoạt động. Nếu đã chuyển cọc, hãy gửi khiếu nại để được hoàn tiền.`,
          b.id,
        ]
      );
    }
    cancelled = upcoming.rowCount;
    // PRD 2.2.6.2: vi hoi vien con tien cua cac cum san nay bi dong bang cho admin hoan tra
    await freezeOwnerWallets(c, userId);
  }

  const r = await c.query(`UPDATE app_user SET status = 'LOCKED', updated_at = now() WHERE id = $1 RETURNING id, status`, [
    userId,
  ]);
  return { user: r.rows[0], cancelled_bookings: cancelled };
}

// PUT /api/admin/users/:id/status  body: { status: ACTIVE | LOCKED, confirm? }
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { status, confirm = false } = req.body || {};
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'status', reason: 'ACTIVE | LOCKED' } });
    }
    if (userId === req.user.id) {
      throw new AppError('INVALID_OPERATION', { message: 'Khong the tu khoa tai khoan cua minh' });
    }

    const out = await withTransaction(async (c) => {
      if (status === 'LOCKED') return lockUser(c, userId, confirm);
      const r = await c.query(`UPDATE app_user SET status = 'ACTIVE', updated_at = now() WHERE id = $1 RETURNING id, status`, [
        userId,
      ]);
      if (r.rowCount === 0) throw new AppError('USER_NOT_FOUND');
      return { user: r.rows[0], cancelled_bookings: 0 };
    });
    res.json({ message: 'User status updated', ...out });
  } catch (err) {
    next(err);
  }
});

// ===== Khieu nai (PRD 3.2) =====

// GET /api/admin/complaints?status=NEW,IN_PROGRESS
router.get('/complaints', async (req, res, next) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(',') : null;
    const r = await query(
      `SELECT ct.id, ct.code, ct.status, ct.subject, ct.content, ct.resolution, ct.created_at, ct.closed_at,
              ct.info_due_at, (ct.status = 'NEED_INFO' AND ct.info_due_at < now()) AS info_overdue,
              b.code AS booking_code, b.status AS booking_status, b.deposit_amount,
              v.name AS venue_name,
              p.full_name AS reporter_name, u.phone AS reporter_phone,
              (SELECT count(*) FROM complaint_message cm WHERE cm.ticket_id = ct.id) AS message_count,
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

// GET /api/admin/complaints/:id - Ho so day du de xac minh: don, giao dich coc, nhat ky chat, trao doi, cac ben lien quan.
// Mo ticket NEW lan dau -> IN_PROGRESS va gan cho admin dang xem.
router.get('/complaints/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const t = await query(
      `UPDATE complaint_ticket
          SET status = CASE WHEN status = 'NEW' THEN 'IN_PROGRESS'::ticket_status ELSE status END,
              assigned_admin_id = COALESCE(assigned_admin_id, $2)
        WHERE id = $1
        RETURNING *, (status = 'NEED_INFO' AND info_due_at < now()) AS info_overdue`,
      [id, req.user.id]
    );
    if (t.rowCount === 0) throw new AppError('TICKET_NOT_FOUND');
    const ticket = t.rows[0];

    const [reporter, booking, slots, payments, chat, messages, evidence, parties] = await Promise.all([
      query(
        `SELECT u.id, u.phone, u.email, u.status, p.full_name, p.reputation_score
           FROM app_user u LEFT JOIN user_profile p ON p.user_id = u.id WHERE u.id = $1`,
        [ticket.reporter_id]
      ),
      query(
        `SELECT b.id, b.code, b.kind, b.status, b.total_amount, b.deposit_amount, b.created_at, b.cancelled_at,
                b.cancel_reason, v.name AS venue_name, v.address AS venue_address
           FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.id = $1`,
        [ticket.booking_id]
      ),
      query(
        `SELECT s.play_date, to_char(lower(s.time_range), 'HH24:MI') AS start_time,
                to_char(upper(s.time_range), 'HH24:MI') AS end_time, s.price, s.status, f.name AS field_name
           FROM booking_slot s JOIN field f ON f.id = s.field_id
          WHERE s.booking_id = $1 ORDER BY lower(s.time_range)`,
        [ticket.booking_id]
      ),
      query(
        `SELECT id, method, status, amount, provider_ref, provider_txn_no, bill_image_url, paid_at, created_at
           FROM payment WHERE booking_id = $1 ORDER BY created_at`,
        [ticket.booking_id]
      ),
      query(
        `SELECT m.id, p.full_name AS sender_name, m.content, m.created_at
           FROM conversation c JOIN message m ON m.conversation_id = c.id
           LEFT JOIN user_profile p ON p.user_id = m.sender_id
          WHERE c.booking_id = $1 ORDER BY m.created_at LIMIT 300`,
        [ticket.booking_id]
      ),
      query(
        `SELECT cm.id, cm.author_id, p.full_name AS author_name, (cm.author_id = $2) AS from_reporter,
                cm.content, cm.created_at
           FROM complaint_message cm LEFT JOIN user_profile p ON p.user_id = cm.author_id
          WHERE cm.ticket_id = $1 ORDER BY cm.created_at`,
        [ticket.id, ticket.reporter_id]
      ),
      query(`SELECT id, url, created_at FROM complaint_evidence WHERE ticket_id = $1 ORDER BY created_at`, [ticket.id]),
      // Nguoi co the bi xu ly: nguoi dat, chu san, nguoi tham gia tran
      query(
        `SELECT DISTINCT ON (u.id) u.id, u.role, u.status, p.full_name, p.reputation_score, x.relation
           FROM (
             SELECT b.user_id AS id, 'Người đặt sân' AS relation, 1 AS ord FROM booking b WHERE b.id = $1
             UNION ALL
             SELECT v.owner_id, 'Chủ sân', 2 FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.id = $1
             UNION ALL
             SELECT mp.user_id, 'Người tham gia trận', 3 FROM match_participant mp WHERE mp.booking_id = $1
           ) x
           JOIN app_user u ON u.id = x.id
           LEFT JOIN user_profile p ON p.user_id = u.id
          ORDER BY u.id, x.ord`,
        [ticket.booking_id]
      ),
    ]);

    res.json({
      ...ticket,
      reporter: reporter.rows[0] || null,
      booking: booking.rows[0] ? { ...booking.rows[0], slots: slots.rows } : null,
      payments: payments.rows,
      chat_log: chat.rows,
      messages: messages.rows,
      evidence: evidence.rows,
      parties: parties.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/complaints/:id/request-info  body: { message }
// Thieu bang chung: chuyen NEED_INFO, hen nguoi gui bo sung trong 24h
router.post('/complaints/:id/request-info', async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 2000) {
      throw new AppError('INVALID_FIELD', { details: { field: 'message', reason: '1-2000 ký tự' } });
    }
    const out = await withTransaction(async (c) => {
      const t = await c.query(`SELECT * FROM complaint_ticket WHERE id = $1 FOR UPDATE`, [Number(req.params.id)]);
      if (t.rowCount === 0) throw new AppError('TICKET_NOT_FOUND');
      const ticket = t.rows[0];
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        throw new AppError('INVALID_STATUS', { details: { status: ticket.status } });
      }
      const r = await c.query(
        `UPDATE complaint_ticket SET status = 'NEED_INFO', info_due_at = now() + interval '24 hours',
                assigned_admin_id = COALESCE(assigned_admin_id, $2)
          WHERE id = $1 RETURNING id, code, status, info_due_at`,
        [ticket.id, req.user.id]
      );
      await c.query(`INSERT INTO complaint_message (ticket_id, author_id, content) VALUES ($1, $2, $3)`, [
        ticket.id,
        req.user.id,
        message,
      ]);
      await c.query(
        `INSERT INTO notification (user_id, type, title, body)
         VALUES ($1, 'COMPLAINT_NEED_INFO', $2, $3)`,
        [ticket.reporter_id, `Khiếu nại ${ticket.code} cần bổ sung thông tin trong 24 giờ`, message.slice(0, 500)]
      );
      return r.rows[0];
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/complaints/:id/resolve
// body: { outcome: REFUND | REJECT, resolution, penalty_user_id?, penalty_points?, lock_user_id? }
// REFUND: hoan 100% cac khoan coc da thanh toan, don chuyen sang REFUNDED va nha slot.
// Kem theo co the tru diem uy tin va/hoac khoa tai khoan vi pham (chi nguoi lien quan toi don).
router.post('/complaints/:id/resolve', async (req, res, next) => {
  const { outcome, resolution, penalty_user_id, penalty_points, lock_user_id } = req.body || {};
  try {
    requireFields(req.body, ['outcome', 'resolution']);
    if (!['REFUND', 'REJECT'].includes(outcome)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'outcome', reason: 'REFUND | REJECT' } });
    }
    const points = penalty_user_id ? Number(penalty_points) : 0;
    if (penalty_user_id && (!Number.isInteger(points) || points < 1 || points > 50)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'penalty_points', reason: '1-50' } });
    }

    const out = await withTransaction(async (c) => {
      const t = await c.query(`SELECT * FROM complaint_ticket WHERE id = $1 FOR UPDATE`, [Number(req.params.id)]);
      if (t.rowCount === 0) throw new AppError('TICKET_NOT_FOUND');
      const ticket = t.rows[0];
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        throw new AppError('INVALID_STATUS', { details: { status: ticket.status } });
      }

      const related = async (userId) => {
        const r = await c.query(
          `SELECT 1 FROM booking b JOIN venue v ON v.id = b.venue_id
            WHERE b.id = $1 AND (b.user_id = $2 OR v.owner_id = $2
                  OR EXISTS (SELECT 1 FROM match_participant mp WHERE mp.booking_id = b.id AND mp.user_id = $2))`,
          [ticket.booking_id, userId]
        );
        if (r.rowCount === 0) {
          throw new AppError('INVALID_FIELD', { message: 'Chỉ xử lý được người liên quan tới đơn bị khiếu nại' });
        }
      };

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
        await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [ticket.booking_id]);
      }

      const actions = [outcome === 'REFUND' ? `[HOÀN CỌC ${refunded.toLocaleString('vi-VN')}đ]` : '[TỪ CHỐI]'];
      if (penalty_user_id) {
        await related(Number(penalty_user_id));
        await c.query(`SELECT fn_apply_reputation($1, $2::smallint, $3, 'BOOKING', $4)`, [
          Number(penalty_user_id),
          -points,
          `Khiếu nại ${ticket.code}`,
          ticket.booking_id,
        ]);
        await c.query(
          `INSERT INTO notification (user_id, type, title, body) VALUES ($1, 'REPUTATION_PENALTY', $2, $3)`,
          [Number(penalty_user_id), `Bạn bị trừ ${points} điểm uy tín`, `Theo kết quả xử lý khiếu nại ${ticket.code}.`]
        );
        actions.push(`[TRỪ ${points} ĐIỂM UY TÍN user #${penalty_user_id}]`);
      }
      if (lock_user_id) {
        if (Number(lock_user_id) === req.user.id) throw new AppError('INVALID_OPERATION');
        await related(Number(lock_user_id));
        await lockUser(c, Number(lock_user_id), true);
        actions.push(`[KHÓA TÀI KHOẢN user #${lock_user_id}]`);
      }

      const r = await c.query(
        `UPDATE complaint_ticket SET status = 'RESOLVED', resolution = $2, assigned_admin_id = $3,
                closed_at = now(), info_due_at = NULL
          WHERE id = $1 RETURNING id, code, status, resolution, closed_at`,
        [ticket.id, `${actions.join(' ')} ${resolution}`, req.user.id]
      );
      await c.query(
        `INSERT INTO notification (user_id, type, title, body) VALUES ($1, 'COMPLAINT_RESOLVED', $2, $3)`,
        [
          ticket.reporter_id,
          `Khiếu nại ${ticket.code} đã được xử lý`,
          (outcome === 'REFUND' ? `Đã hoàn ${refunded.toLocaleString('vi-VN')}đ tiền cọc. ` : '') +
            String(resolution).slice(0, 400),
        ]
      );
      return { ...r.rows[0], refunded_amount: refunded };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// ===== Bao cao he thong (PRD 3.3) =====

// GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD (mac dinh thang nay, toi da 366 ngay)
router.get('/reports', async (req, res, next) => {
  try {
    const range = parseRange(req.query);
    if (range.days > MAX_DIRECT_DAYS) {
      throw new AppError('INVALID_TIME_RANGE', {
        message: 'Khoảng thời gian quá dài để xem trực tiếp. Hãy dùng "Xuất file", báo cáo sẽ được gửi qua email.',
        details: { max_days: MAX_DIRECT_DAYS },
      });
    }
    const [report, open] = await Promise.all([
      buildReport({ query }, range),
      query(`SELECT count(*) AS n FROM complaint_ticket WHERE status NOT IN ('RESOLVED', 'CLOSED')`),
    ]);
    const top = (await venueBreakdown({ query }, range)).slice(0, 5);
    res.json({ ...report, open_complaints: Number(open.rows[0].n), top_venues: top });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/export?from=&to=
// <= 366 ngay: tra file CSV ngay; dai hon: chay nen va gui file qua email cua admin (202)
router.get('/reports/export', async (req, res, next) => {
  try {
    const range = parseRange(req.query);
    const filename = `bao-cao-sanbong-${range.from}_${range.to}.csv`;
    const build = async () => toCsv(await buildReport({ query }, range), await venueBreakdown({ query }, range));

    if (range.days <= MAX_DIRECT_DAYS) {
      const csv = await build();
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    const admin = await query(`SELECT email FROM app_user WHERE id = $1`, [req.user.id]);
    const email = admin.rows[0]?.email;
    if (!email) {
      throw new AppError('INVALID_OPERATION', { message: 'Tài khoản admin chưa có email để nhận báo cáo' });
    }
    res.status(202).json({ queued: true, email, message: `Báo cáo đang được tạo và sẽ gửi tới ${email}` });

    // Chay sau khi da tra loi request; loi chi ghi log va bao trong hop thong bao
    setImmediate(async () => {
      try {
        const csv = await build();
        await sendMailWithAttachment({
          to: email,
          subject: `Báo cáo SanBong.vn ${range.from} → ${range.to}`,
          html: `<p>Báo cáo toàn hệ thống từ <b>${range.from}</b> đến <b>${range.to}</b> được đính kèm (mở bằng Excel).</p>`,
          filename,
          content: csv,
        });
        await query(`INSERT INTO notification (user_id, type, title, body) VALUES ($1, 'REPORT_READY', $2, $3)`, [
          req.user.id,
          'Báo cáo đã được gửi qua email',
          `${range.from} → ${range.to}, gửi tới ${email}`,
        ]);
      } catch (err) {
        console.error('[report] xuat bao cao that bai: %s', err.message);
        await query(`INSERT INTO notification (user_id, type, title, body) VALUES ($1, 'REPORT_FAILED', $2, $3)`, [
          req.user.id,
          'Xuất báo cáo thất bại',
          err.message.slice(0, 400),
        ]).catch(() => {});
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
