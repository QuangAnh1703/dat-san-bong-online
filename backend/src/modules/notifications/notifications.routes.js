'use strict';
const express = require('express');
const { query } = require('../../db');
const { requireAuthenticated } = require('../../middlewares/auth');

const router = express.Router();
router.use(requireAuthenticated);

// GET /api/notifications?page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [rows, counts] = await Promise.all([
      query(
        `SELECT n.id, n.type, n.title, n.body, n.is_read, n.created_at, n.ref_kind, n.ref_id,
                CASE WHEN n.ref_kind = 'BOOKING' THEN b.code END AS booking_code
           FROM notification n
           LEFT JOIN booking b ON n.ref_kind = 'BOOKING' AND b.id = n.ref_id
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC, n.id DESC
          LIMIT $2 OFFSET $3`,
        [req.user.id, limit, (page - 1) * limit]
      ),
      query(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT is_read)::int AS unread
           FROM notification WHERE user_id = $1`,
        [req.user.id]
      ),
    ]);
    res.json({ page, limit, ...counts.rows[0], count: rows.rowCount, data: rows.rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/notifications/read  body: { ids?: number[] }  — bỏ trống ids thì đánh dấu tất cả
router.post('/read', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null;
    const r = await query(
      `UPDATE notification SET is_read = TRUE
        WHERE user_id = $1 AND NOT is_read AND ($2::bigint[] IS NULL OR id = ANY($2::bigint[]))`,
      [req.user.id, ids]
    );
    res.json({ updated: r.rowCount });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
