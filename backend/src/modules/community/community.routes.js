'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const repo = require('./community.repository');
const { notify } = require('./freelance.repository');

// PRD 1.5: phai con it nhat 30 phut truoc gio da moi duoc dang tim doi
const MIN_MINUTES_BEFORE_MATCH = 30;

const router = express.Router();

// List match posts (browse teams/players)
// GET /api/community/posts?type=TEAM_FINDS_PLAYER&district=HK&skill_level=INTERMEDIATE
router.get('/posts', async (req, res, next) => {
  try {
    const { type, district, skill_level, date_from, date_to, limit = 20, offset = 0 } = req.query;
    const posts = await repo.listPosts({
      type: type || undefined,
      district_code: district || undefined,
      required_level: skill_level || undefined,
      play_date_from: date_from || undefined,
      play_date_to: date_to || undefined,
      status: 'OPEN',
      viewer_id: req.user?.id,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ count: posts.length, data: posts });
  } catch (err) {
    next(err);
  }
});

// Get post details with requests
router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await repo.getPostById(req.params.id);
    if (!post) {
      return next(new AppError('POST_NOT_FOUND'));
    }

    res.json({ data: post });
  } catch (err) {
    next(err);
  }
});

// Create a new match post (PLAYER creates to find team, TEAM creates to find players)
// Bai cua doi (TEAM_*) chi can booking_id: ngay, gio, khu vuc, han bai dang lay tu don dat
router.post(
  '/posts',
  requireAuthenticated,
  requireRole('PLAYER', 'OWNER', 'ADMIN'),
  async (req, res, next) => {
    const { type, booking_id, required_level, deal_note, slots_needed, cost_kind, cost_amount, content } =
      req.body;
    let { team_id, district_code, play_date, time_span, expires_at } = req.body;

    try {
      requireFields(req.body, ['type']);

      if (!['TEAM_FINDS_TEAM', 'TEAM_FINDS_PLAYER', 'PLAYER_FINDS_TEAM'].includes(type)) {
        throw new AppError('INVALID_FIELD', { details: { field: 'type' } });
      }

      let teamLevel = null;
      if (type.startsWith('TEAM_')) {
        requireFields(req.body, ['booking_id']);
        const b = await query(
          `SELECT b.id, b.user_id, b.status, v.district_code,
                s.play_date, lower(s.time_range) AS start_at,
                (extract(hour FROM lower(s.time_range)) * 60 + extract(minute FROM lower(s.time_range)))::int AS s_min,
                (extract(hour FROM upper(s.time_range)) * 60 + extract(minute FROM upper(s.time_range)))::int AS e_min
           FROM booking b JOIN venue v ON v.id = b.venue_id
           JOIN LATERAL (SELECT * FROM booking_slot bs WHERE bs.booking_id = b.id
                          ORDER BY lower(bs.time_range) LIMIT 1) s ON TRUE
          WHERE b.id = $1`,
          [booking_id]
        );
        if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND');
        const booking = b.rows[0];
        if (booking.user_id !== req.user.id) throw new AppError('FORBIDDEN');
        if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(booking.status)) {
          throw new AppError('INVALID_STATUS', { details: { status: booking.status } });
        }
        if (new Date(booking.start_at) - Date.now() < MIN_MINUTES_BEFORE_MATCH * 60 * 1000) {
          throw new AppError('MATCH_TOO_SOON');
        }

        if (!team_id) {
          const t = await query(`SELECT id, skill_level FROM team WHERE captain_id = $1`, [req.user.id]);
          if (t.rowCount === 0) throw new AppError('TEAM_REQUIRED');
          team_id = t.rows[0].id;
          teamLevel = t.rows[0].skill_level;
        }
        district_code = district_code || booking.district_code;
        play_date = play_date || booking.play_date;
        time_span = time_span || `[${booking.s_min},${booking.e_min})`;
        expires_at = expires_at || booking.start_at;
      } else {
        requireFields(req.body, ['district_code', 'play_date', 'expires_at']);
      }

      // TEAM_FINDS_PLAYER requires slots_needed and cost info
      if (type === 'TEAM_FINDS_PLAYER' && (!slots_needed || !cost_kind)) {
        throw new AppError('INVALID_FIELD', { details: { field: 'slots_needed/cost_kind required' } });
      }

      const post = await repo.createPost({
        type,
        author_user_id: req.user.id,
        team_id: team_id || null,
        booking_id: booking_id || null,
        district_code,
        play_date,
        time_span: time_span || null,
        required_level: required_level || teamLevel || 'INTERMEDIATE',
        deal_note: deal_note || null,
        slots_needed: slots_needed || null,
        cost_kind: cost_kind || null,
        cost_amount: cost_amount || null,
        content: content || '',
        expires_at,
      });

      res.status(201).json({ message: 'Post created', data: post });
    } catch (err) {
      next(err);
    }
  }
);

// Close/match a post (update status)
router.put('/posts/:id', requireAuthenticated, async (req, res, next) => {
  const { status } = req.body;

  try {
    const post = await repo.getPostById(req.params.id);
    if (!post) {
      return next(new AppError('POST_NOT_FOUND'));
    }

    if (post.author_user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('FORBIDDEN'));
    }

    const updated = await repo.updatePost(req.params.id, { status });
    res.json({ message: 'Post updated', data: updated });
  } catch (err) {
    next(err);
  }
});

// Send join request
// Cap keo doi-doi (PRD 1.5): moi doi chi gui mot lan / tran, doi khach khong duoc trung lich da khac cung khung gio
router.post('/requests', requireAuthenticated, async (req, res, next) => {
  const { post_id, message } = req.body || {};

  try {
    requireFields(req.body, ['post_id']);

    const out = await withTransaction(async (c) => {
      const p = await c.query(
        `SELECT mp.*, tstzrange((mp.play_date + lower(mp.time_span) * interval '1 minute')::timestamptz,
                                (mp.play_date + upper(mp.time_span) * interval '1 minute')::timestamptz, '[)') AS span
           FROM match_post mp WHERE mp.id = $1 FOR UPDATE`,
        [post_id]
      );
      if (p.rowCount === 0) throw new AppError('POST_NOT_FOUND');
      const post = p.rows[0];
      if (post.status !== 'OPEN') throw new AppError('POST_NOT_OPEN');
      if (post.author_user_id === req.user.id) {
        throw new AppError('INVALID_OPERATION', { message: 'Khong the gui loi moi vao bai cua chinh minh' });
      }

      const existing = await c.query(`SELECT 1 FROM join_request WHERE post_id = $1 AND requester_user_id = $2`, [
        post_id,
        req.user.id,
      ]);
      if (existing.rowCount > 0) throw new AppError('REQUEST_ALREADY_EXISTS');

      const team = (await c.query(`SELECT id, name FROM team WHERE captain_id = $1`, [req.user.id])).rows[0];
      if (post.type === 'TEAM_FINDS_TEAM') {
        if (!team) throw new AppError('TEAM_REQUIRED');
        if (post.time_span) {
          const clash = await c.query(
            `SELECT 1 FROM booking b JOIN booking_slot s ON s.booking_id = b.id
              WHERE s.status IN ('HELD', 'CONFIRMED')
                AND b.status IN ('HELD', 'PENDING_VERIFY', 'CONFIRMED')
                AND s.time_range && $2::tstzrange
                AND (b.user_id = $1 OR EXISTS (SELECT 1 FROM match_participant mp
                                                 WHERE mp.booking_id = b.id AND mp.user_id = $1
                                                   AND mp.cancelled_at IS NULL))
              LIMIT 1`,
            [req.user.id, post.span]
          );
          if (clash.rowCount) throw new AppError('SCHEDULE_CONFLICT');
        }
      }

      const r = await c.query(
        `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [post_id, req.user.id, team?.id || null, message ? String(message).slice(0, 300) : null]
      );
      const me = await c.query(`SELECT full_name FROM user_profile WHERE user_id = $1`, [req.user.id]);
      await notify(c, {
        userId: post.author_user_id,
        type: 'MATCH_REQUEST',
        title: `${team?.name || me.rows[0]?.full_name || 'Một đội'} muốn giao hữu với bạn`,
        body: message ? String(message).slice(0, 300) : 'Vào mục Cáp kèo để xem hồ sơ và điểm uy tín của đội khách.',
        bookingId: post.booking_id,
      });
      return r.rows[0];
    });

    res.status(201).json({ message: 'Join request sent', data: out });
  } catch (err) {
    next(err);
  }
});

// List join requests (received by post author or sent by user)
router.get('/requests', requireAuthenticated, async (req, res, next) => {
  try {
    const { post_id, status, limit = 20, offset = 0 } = req.query;
    let requests;

    if (post_id) {
      const post = await repo.getPostById(post_id);
      if (!post || post.author_user_id !== req.user.id) {
        return next(new AppError('FORBIDDEN'));
      }
      requests = await repo.listJoinRequests({
        post_id,
        status: status || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } else {
      requests = await repo.listJoinRequests({
        requester_user_id: req.user.id,
        status: status || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    res.json({ count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
});

// Approve/reject join request
// Chap nhan doi A: dong bai, cac doi con lai tu dong bi tu choi + nhan thong bao, mo nhom chat cho hai doi
router.put('/requests/:id', requireAuthenticated, async (req, res, next) => {
  const { status } = req.body || {};

  try {
    requireFields(req.body, ['status']);
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'status' } });
    }

    const out = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT jr.*, mp.author_user_id, mp.type AS post_type, mp.status AS post_status, mp.booking_id AS post_booking_id,
                mp.slots_needed, mp.slots_filled
           FROM join_request jr JOIN match_post mp ON mp.id = jr.post_id
          WHERE jr.id = $1 FOR UPDATE OF jr, mp`,
        [req.params.id]
      );
      if (r.rowCount === 0) throw new AppError('REQUEST_NOT_FOUND');
      const jr = r.rows[0];
      if (jr.author_user_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (jr.status !== 'PENDING') throw new AppError('INVALID_STATUS', { details: { status: jr.status } });

      const label = await c.query(
        `SELECT v.name AS venue_name, to_char(lower(s.time_range), 'HH24:MI DD/MM') AS start_label,
                lower(s.time_range) <= now() AS started
           FROM booking b JOIN venue v ON v.id = b.venue_id
           JOIN LATERAL (SELECT time_range FROM booking_slot WHERE booking_id = b.id
                          ORDER BY lower(time_range) LIMIT 1) s ON TRUE
          WHERE b.id = $1`,
        [jr.post_booking_id]
      );
      const match = label.rows[0] ? `${label.rows[0].start_label} tại ${label.rows[0].venue_name}` : 'trận giao hữu';

      let conversationId = null;
      if (status === 'ACCEPTED') {
        if (jr.post_status !== 'OPEN') throw new AppError('POST_NOT_OPEN');
        if (label.rows[0]?.started) throw new AppError('BOOKING_ALREADY_STARTED');

        if (jr.post_type === 'TEAM_FINDS_TEAM') {
          await c.query(`UPDATE match_post SET status = 'MATCHED', closed_at = now() WHERE id = $1`, [jr.post_id]);
          const others = await c.query(
            `UPDATE join_request SET status = 'REJECTED', responded_at = now()
              WHERE post_id = $1 AND status = 'PENDING' AND id <> $2
              RETURNING requester_user_id`,
            [jr.post_id, jr.id]
          );
          for (const o of others.rows) {
            await notify(c, {
              userId: o.requester_user_id,
              type: 'MATCH_REJECTED',
              title: 'Kèo giao hữu đã có đối',
              body: `Đội chủ nhà đã chốt kèo ${match} với đội khác. Hãy tìm kèo khác nhé!`,
              bookingId: jr.post_booking_id,
            });
          }
        } else if (jr.post_type === 'TEAM_FINDS_PLAYER') {
          if (jr.slots_filled >= jr.slots_needed) throw new AppError('RECRUIT_FULL');
          await c.query(
            `UPDATE match_post SET slots_filled = slots_filled + 1,
                    status = CASE WHEN slots_filled + 1 >= slots_needed THEN 'MATCHED'::post_status ELSE status END,
                    closed_at = CASE WHEN slots_filled + 1 >= slots_needed THEN now() ELSE closed_at END
              WHERE id = $1`,
            [jr.post_id]
          );
        }

        if (jr.post_booking_id) {
          await c.query(
            `INSERT INTO match_participant (booking_id, user_id, source)
             VALUES ($1, $2, $3)
             ON CONFLICT (booking_id, user_id) DO UPDATE SET cancelled_at = NULL, joined_at = now()`,
            [jr.post_booking_id, jr.requester_user_id, jr.post_type === 'TEAM_FINDS_TEAM' ? 'TEAM' : 'FREELANCE']
          );
          conversationId = await repo.joinMatchChat(c, {
            bookingId: jr.post_booking_id,
            matchPostId: jr.post_id,
            userIds: [req.user.id, jr.requester_user_id],
          });
        }
      }

      await c.query(`UPDATE join_request SET status = $2, responded_at = now() WHERE id = $1`, [jr.id, status]);
      await notify(c, {
        userId: jr.requester_user_id,
        type: status === 'ACCEPTED' ? 'MATCH_ACCEPTED' : 'MATCH_REJECTED',
        title: status === 'ACCEPTED' ? 'Kèo giao hữu đã được chốt!' : 'Lời mời giao hữu bị từ chối',
        body:
          status === 'ACCEPTED'
            ? `${match}. Vào mục Tin nhắn để trao đổi với đội chủ nhà.`
            : `Đội chủ nhà đã từ chối lời mời cho trận ${match}.`,
        bookingId: jr.post_booking_id,
      });
      return { id: jr.id, status, conversation_id: conversationId };
    });

    res.json({ message: `Request ${status.toLowerCase()}`, data: out });
  } catch (err) {
    next(err);
  }
});

// ===== Tin nhan (nhom chat cua tran) =====

async function assertMember(conversationId, userId) {
  const m = await query(`SELECT 1 FROM conversation_member WHERE conversation_id = $1 AND user_id = $2`, [
    conversationId,
    userId,
  ]);
  if (m.rowCount === 0) throw new AppError('FORBIDDEN');
}

// GET /api/community/conversations - Nhom chat cua toi kem tran, thanh vien, tin cuoi, so tin chua doc
router.get('/conversations', requireAuthenticated, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT c.id, c.booking_id, b.code AS booking_code, v.name AS venue_name,
              to_char(lower(s.time_range), 'YYYY-MM-DD"T"HH24:MI:SS') AS starts_at,
              COALESCE((SELECT json_agg(json_build_object('user_id', cm2.user_id, 'name', p.full_name, 'team_name', t.name)
                                         ORDER BY cm2.joined_at)
                          FROM conversation_member cm2
                          LEFT JOIN user_profile p ON p.user_id = cm2.user_id
                          LEFT JOIN team t ON t.captain_id = cm2.user_id
                         WHERE cm2.conversation_id = c.id), '[]') AS members,
              lm.content AS last_message, lm.created_at AS last_message_at, lm.sender_id AS last_sender_id,
              (SELECT count(*) FROM message m
                WHERE m.conversation_id = c.id AND m.sender_id <> $1
                  AND m.created_at > COALESCE(cm.last_read_at, '-infinity')) AS unread
         FROM conversation c
         JOIN conversation_member cm ON cm.conversation_id = c.id AND cm.user_id = $1
         LEFT JOIN booking b ON b.id = c.booking_id
         LEFT JOIN venue v ON v.id = b.venue_id
         LEFT JOIN LATERAL (SELECT time_range FROM booking_slot WHERE booking_id = b.id
                             ORDER BY lower(time_range) LIMIT 1) s ON TRUE
         LEFT JOIN LATERAL (SELECT content, created_at, sender_id FROM message
                             WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) lm ON TRUE
        ORDER BY COALESCE(lm.created_at, c.created_at) DESC
        LIMIT 100`,
      [req.user.id]
    );
    const unread = r.rows.reduce((s, x) => s + Number(x.unread), 0);
    res.json({ count: r.rowCount, unread, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/community/conversations/:id/messages?after=<message id> - doc tin, danh dau da doc
router.get('/conversations/:id/messages', requireAuthenticated, async (req, res, next) => {
  try {
    const conversationId = Number(req.params.id);
    await assertMember(conversationId, req.user.id);
    const after = Number(req.query.after) || 0;
    const r = await query(
      `SELECT * FROM (
         SELECT m.id, m.sender_id, p.full_name AS sender_name, m.content, m.created_at
           FROM message m LEFT JOIN user_profile p ON p.user_id = m.sender_id
          WHERE m.conversation_id = $1 AND m.id > $2
          ORDER BY m.id DESC LIMIT 200) x
        ORDER BY id`,
      [conversationId, after]
    );
    await query(
      `UPDATE conversation_member SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/community/conversations/:id/messages  body: { content }
router.post('/conversations/:id/messages', requireAuthenticated, async (req, res, next) => {
  try {
    const conversationId = Number(req.params.id);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('MISSING_FIELD', { details: { missing: ['content'] } });
    if (content.length > 2000) throw new AppError('INVALID_FIELD', { details: { field: 'content', reason: '<= 2000' } });
    await assertMember(conversationId, req.user.id);

    const r = await query(
      `INSERT INTO message (conversation_id, sender_id, content) VALUES ($1, $2, $3)
       RETURNING id, sender_id, content, created_at`,
      [conversationId, req.user.id, content]
    );
    await query(
      `UPDATE conversation_member SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
