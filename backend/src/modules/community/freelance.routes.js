'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const repo = require('./freelance.repository');

const router = express.Router();
router.use(requireAuthenticated);

const INVITE_MINUTES = 30;
const LATE_CANCEL_MINUTES = 60;
const LATE_CANCEL_PENALTY = -5;

const paging = (q) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit };
};

const listResponse = (rows, { page, limit }) => ({
  page,
  limit,
  total: rows[0]?.total || 0,
  count: rows.length,
  data: rows.map(({ total, ...r }) => r),
});

const parseTime = (s) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(s || ''));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

function cleanPositions(input) {
  if (input === undefined || input === null) return ['ANY'];
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return ['ANY'];
  if (!list.every((p) => repo.POSITIONS.includes(p))) {
    throw new AppError('INVALID_FIELD', { details: { field: 'positions', allowed: repo.POSITIONS } });
  }
  return [...new Set(list)];
}

function checkLevel(level) {
  if (!repo.SKILL_RANK[level]) {
    throw new AppError('INVALID_FIELD', { details: { field: 'level', allowed: Object.keys(repo.SKILL_RANK) } });
  }
}

// Trận đã đặt của chính mình, còn hiệu lực và chưa tới giờ đá
async function loadOwnUpcomingBooking(db, { code, userId }) {
  const b = await db.query(
    `SELECT b.id, b.code, b.user_id, b.status, b.team_id, v.name AS venue_name, v.district_code,
            s.play_date, lower(s.time_range) AS start_at,
            (extract(hour FROM lower(s.time_range)) * 60 + extract(minute FROM lower(s.time_range)))::int AS s_min,
            (extract(hour FROM upper(s.time_range)) * 60 + extract(minute FROM upper(s.time_range)))::int AS e_min
       FROM booking b JOIN venue v ON v.id = b.venue_id
       JOIN LATERAL (SELECT * FROM booking_slot bs WHERE bs.booking_id = b.id
                      ORDER BY lower(bs.time_range) LIMIT 1) s ON TRUE
      WHERE b.code = $1`,
    [code]
  );
  if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND', { details: { code } });
  const booking = b.rows[0];
  if (booking.user_id !== userId) throw new AppError('FORBIDDEN');
  if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(booking.status)) {
    throw new AppError('INVALID_STATUS', { details: { status: booking.status } });
  }
  if (new Date(booking.start_at) <= new Date()) throw new AppError('BOOKING_ALREADY_STARTED');
  return booking;
}

const pad2 = (n) => String(n).padStart(2, '0');
const matchLabel = (b) => {
  const d = new Date(b.start_at);
  return `${b.venue_name} · ${pad2(d.getHours())}:${pad2(d.getMinutes())} ngày ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

async function addParticipant(db, bookingId, userId) {
  await db.query(
    `INSERT INTO match_participant (booking_id, user_id, source, position)
     SELECT $1, $2, 'FREELANCE', preferred_position FROM user_profile WHERE user_id = $2
     ON CONFLICT (booking_id, user_id) DO UPDATE
        SET cancelled_at = NULL, joined_at = now(), source = 'FREELANCE'`,
    [bookingId, userId]
  );
}

// Cộng 1 người vào bài tuyển; đủ người thì chốt bài và từ chối các yêu cầu còn chờ
async function fillRecruitSlot(db, postId) {
  const p = await db.query(
    `UPDATE match_post SET slots_filled = slots_filled + 1,
            status = CASE WHEN slots_filled + 1 >= slots_needed THEN 'MATCHED'::post_status ELSE status END,
            closed_at = CASE WHEN slots_filled + 1 >= slots_needed THEN now() ELSE closed_at END
      WHERE id = $1
      RETURNING status`,
    [postId]
  );
  if (p.rows[0]?.status === 'MATCHED') {
    await db.query(
      `UPDATE join_request SET status = 'REJECTED', responded_at = now()
        WHERE post_id = $1 AND status = 'PENDING'`,
      [postId]
    );
  }
}

// ------------------------------------------------------------------ Đội tìm người

// GET /api/freelance/recruits?district=&period=morning|afternoon|evening&level=&cost=&page=&limit=
router.get('/recruits', async (req, res, next) => {
  try {
    const pg = paging(req.query);
    const rows = await repo.listRecruits({
      viewerId: req.user.id,
      district: req.query.district || null,
      period: req.query.period || null,
      level: req.query.level || null,
      cost: req.query.cost || null,
      ...pg,
    });
    res.json(listResponse(rows, pg));
  } catch (e) {
    next(e);
  }
});

// POST /api/freelance/recruits
// body: { booking_code, slots_needed, positions[], required_level, cost_kind, cost_amount?, content? }
router.post('/recruits', async (req, res, next) => {
  try {
    requireFields(req.body, ['booking_code', 'slots_needed', 'cost_kind']);
    const slots = Number(req.body.slots_needed);
    if (!Number.isInteger(slots) || slots < 1) {
      throw new AppError('VALIDATION_ERROR', { message: 'Số lượng người cần tuyển phải từ 1 trở lên' });
    }
    if (slots > 10) throw new AppError('RECRUIT_LIMIT_EXCEEDED');
    const positions = cleanPositions(req.body.positions);
    const level = req.body.required_level || 'INTERMEDIATE';
    checkLevel(level);
    const costKind = req.body.cost_kind;
    if (!repo.COST_KINDS.includes(costKind)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'cost_kind', allowed: repo.COST_KINDS } });
    }
    const costAmount = costKind === 'FIXED' ? Number(req.body.cost_amount) : null;
    if (costKind === 'FIXED' && !(costAmount > 0)) {
      throw new AppError('VALIDATION_ERROR', { message: 'Nhập số tiền mỗi người phải đóng' });
    }

    const post = await withTransaction(async (c) => {
      const booking = await loadOwnUpcomingBooking(c, { code: req.body.booking_code, userId: req.user.id });
      // Khóa đơn để hai request song song không tạo hai bài tuyển cho cùng một trận
      await c.query(`SELECT 1 FROM booking WHERE id = $1 FOR UPDATE`, [booking.id]);
      const open = await c.query(
        `SELECT 1 FROM match_post WHERE booking_id = $1 AND type = 'TEAM_FINDS_PLAYER' AND status = 'OPEN'`,
        [booking.id]
      );
      if (open.rowCount > 0) throw new AppError('RECRUIT_POST_EXISTS');

      const team = await c.query(`SELECT id FROM team WHERE captain_id = $1`, [req.user.id]);
      const r = await c.query(
        `INSERT INTO match_post (type, booking_id, author_user_id, team_id, district_code, play_date, time_span,
                                 required_level, slots_needed, cost_kind, cost_amount, positions, content, expires_at)
         VALUES ('TEAM_FINDS_PLAYER', $1, $2, $3, $4, $5, int4range($6, $7), $8, $9, $10, $11,
                 $12::position_type[], $13, $14)
         RETURNING id, status, slots_needed, slots_filled, expires_at`,
        [
          booking.id,
          req.user.id,
          booking.team_id || team.rows[0]?.id || null,
          booking.district_code,
          booking.play_date,
          booking.s_min,
          booking.e_min,
          level,
          slots,
          costKind,
          costAmount,
          positions,
          req.body.content ? String(req.body.content).slice(0, 500) : null,
          booking.start_at,
        ]
      );
      return r.rows[0];
    });
    res.status(201).json({ data: post });
  } catch (e) {
    next(e);
  }
});

// POST /api/freelance/recruits/:id/apply  body: { message?, confirm_level? }
router.post('/recruits/:id/apply', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const p = await c.query(
        `SELECT mp.*, b.venue_id, v.name AS venue_name, lower(s.time_range) AS start_at
           FROM match_post mp
           JOIN booking b ON b.id = mp.booking_id
           JOIN venue v ON v.id = b.venue_id
           JOIN LATERAL (SELECT time_range FROM booking_slot WHERE booking_id = b.id
                          ORDER BY lower(time_range) LIMIT 1) s ON TRUE
          WHERE mp.id = $1 AND mp.type = 'TEAM_FINDS_PLAYER'
          FOR UPDATE OF mp`,
        [req.params.id]
      );
      if (p.rowCount === 0) throw new AppError('POST_NOT_FOUND');
      const post = p.rows[0];
      if (post.author_user_id === req.user.id) {
        throw new AppError('INVALID_OPERATION', { message: 'Không thể xin tham gia bài của chính mình' });
      }
      if (post.status === 'MATCHED' || post.slots_filled >= post.slots_needed) throw new AppError('RECRUIT_FULL');
      if (post.status !== 'OPEN' || new Date(post.expires_at) <= new Date()) throw new AppError('POST_NOT_OPEN');

      const inMatch = await c.query(
        `SELECT 1 FROM match_participant WHERE booking_id = $1 AND user_id = $2 AND cancelled_at IS NULL`,
        [post.booking_id, req.user.id]
      );
      if (inMatch.rowCount > 0) throw new AppError('ALREADY_IN_MATCH');

      const me = await c.query(`SELECT full_name, skill_level FROM user_profile WHERE user_id = $1`, [req.user.id]);
      const myLevel = me.rows[0]?.skill_level || 'BEGINNER';
      const below = repo.SKILL_RANK[myLevel] < repo.SKILL_RANK[post.required_level];
      if (below && !req.body?.confirm_level) {
        throw new AppError('LEVEL_MISMATCH', {
          message: `Trình độ của bạn (${repo.SKILL_LABEL[myLevel]}) chưa đạt yêu cầu của bài đăng (${repo.SKILL_LABEL[post.required_level]}). Bạn vẫn muốn gửi yêu cầu?`,
          details: { my_level: myLevel, required_level: post.required_level },
        });
      }

      const message = req.body?.message ? String(req.body.message).slice(0, 300) : null;
      const existing = await c.query(
        `SELECT id, status FROM join_request WHERE post_id = $1 AND requester_user_id = $2`,
        [post.id, req.user.id]
      );
      let request;
      if (existing.rowCount > 0) {
        // Đã hủy / hết hạn trước đó thì cho gửi lại; còn chờ, đã nhận, bị từ chối thì không
        if (!['CANCELLED', 'EXPIRED'].includes(existing.rows[0].status)) throw new AppError('REQUEST_ALREADY_EXISTS');
        request = await c.query(
          `UPDATE join_request SET status = 'PENDING', message = $2, level_warning_ack = $3,
                  responded_at = NULL, created_at = now()
            WHERE id = $1 RETURNING id, status, created_at`,
          [existing.rows[0].id, message, below]
        );
      } else {
        request = await c.query(
          `INSERT INTO join_request (post_id, requester_user_id, message, kind, level_warning_ack)
           VALUES ($1, $2, $3, 'APPLY', $4) RETURNING id, status, created_at`,
          [post.id, req.user.id, message, below]
        );
      }

      await repo.notify(c, {
        userId: post.author_user_id,
        type: 'FREELANCE_APPLY',
        title: `${me.rows[0]?.full_name || 'Một người chơi'} xin tham gia trận của bạn`,
        body: `${matchLabel(post)}${message ? ` — "${message}"` : ''}`,
        bookingId: post.booking_id,
      });
      return request.rows[0];
    });
    res.status(201).json({ data: out });
  } catch (e) {
    next(e);
  }
});

// GET /api/freelance/posts/:id/requests  (chỉ người đăng bài)
router.get('/posts/:id/requests', async (req, res, next) => {
  try {
    const p = await query(`SELECT author_user_id FROM match_post WHERE id = $1`, [req.params.id]);
    if (p.rowCount === 0) throw new AppError('POST_NOT_FOUND');
    if (p.rows[0].author_user_id !== req.user.id) throw new AppError('FORBIDDEN');
    const rows = await repo.listRequestsForPost(req.params.id);
    res.json({ count: rows.length, data: rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/freelance/posts/:id/close  (người đăng tự đóng bài)
router.post('/posts/:id/close', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const p = await c.query(`SELECT id, author_user_id, status FROM match_post WHERE id = $1 FOR UPDATE`, [
        req.params.id,
      ]);
      if (p.rowCount === 0) throw new AppError('POST_NOT_FOUND');
      if (p.rows[0].author_user_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (p.rows[0].status !== 'OPEN') throw new AppError('POST_NOT_OPEN');
      await c.query(`UPDATE match_post SET status = 'CLOSED', closed_at = now() WHERE id = $1`, [req.params.id]);
      await c.query(
        `UPDATE join_request SET status = 'REJECTED', responded_at = now() WHERE post_id = $1 AND status = 'PENDING'`,
        [req.params.id]
      );
      return { id: Number(req.params.id), status: 'CLOSED' };
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// PUT /api/freelance/requests/:id  body: { status: ACCEPTED | REJECTED }
// Người phản hồi luôn là chủ bài đăng: đội trưởng duyệt người xin vào (APPLY),
// người chơi lẻ nhận/từ chối lời mời trên bài tìm đội của mình (INVITE).
router.put('/requests/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'status', allowed: ['ACCEPTED', 'REJECTED'] } });
    }

    const out = await withTransaction(async (c) => {
      const r = await c.query(
        `SELECT jr.*, mp.author_user_id, mp.type AS post_type, mp.status AS post_status,
                mp.booking_id AS post_booking_id, mp.slots_needed, mp.slots_filled, mp.expires_at AS post_expires_at
           FROM join_request jr JOIN match_post mp ON mp.id = jr.post_id
          WHERE jr.id = $1
          FOR UPDATE OF jr, mp`,
        [req.params.id]
      );
      if (r.rowCount === 0) throw new AppError('REQUEST_NOT_FOUND');
      const jr = r.rows[0];
      if (jr.author_user_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (jr.kind === 'INVITE' && jr.status === 'PENDING' && new Date(jr.expires_at) <= new Date()) {
        await c.query(`UPDATE join_request SET status = 'EXPIRED', responded_at = now() WHERE id = $1`, [jr.id]);
        return { expired: true };
      }
      if (jr.status !== 'PENDING') throw new AppError('INVALID_STATUS', { details: { status: jr.status } });

      const bookingId = jr.kind === 'INVITE' ? jr.booking_id : jr.post_booking_id;
      const b = await c.query(
        `SELECT b.id, b.status, b.user_id, v.name AS venue_name, v.address, lower(s.time_range) AS start_at
           FROM booking b JOIN venue v ON v.id = b.venue_id
           JOIN LATERAL (SELECT time_range FROM booking_slot WHERE booking_id = b.id
                          ORDER BY lower(time_range) LIMIT 1) s ON TRUE
          WHERE b.id = $1`,
        [bookingId]
      );
      const booking = b.rows[0];
      const me = await c.query(`SELECT full_name FROM user_profile WHERE user_id = $1`, [req.user.id]);
      const myName = me.rows[0]?.full_name || 'Người chơi';

      if (status === 'ACCEPTED') {
        if (!['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(booking.status)) {
          throw new AppError('INVALID_STATUS', { details: { booking_status: booking.status } });
        }
        if (new Date(booking.start_at) <= new Date()) throw new AppError('BOOKING_ALREADY_STARTED');

        if (jr.kind === 'APPLY') {
          if (jr.post_status === 'MATCHED' || jr.slots_filled >= jr.slots_needed) throw new AppError('RECRUIT_FULL');
          if (jr.post_status !== 'OPEN') throw new AppError('POST_NOT_OPEN');
          await fillRecruitSlot(c, jr.post_id);
        } else {
          // Nếu đội đang có bài tuyển cho trận này thì trừ luôn một chỗ
          const recruit = await c.query(
            `SELECT id, slots_needed, slots_filled FROM match_post
              WHERE booking_id = $1 AND type = 'TEAM_FINDS_PLAYER' AND status = 'OPEN' FOR UPDATE`,
            [bookingId]
          );
          if (recruit.rowCount > 0 && recruit.rows[0].slots_filled < recruit.rows[0].slots_needed) {
            await fillRecruitSlot(c, recruit.rows[0].id);
          }
          // Người chơi đã có trận cho khung giờ này: chốt bài tìm đội, từ chối các lời mời khác
          await c.query(`UPDATE match_post SET status = 'MATCHED', closed_at = now() WHERE id = $1`, [jr.post_id]);
          await c.query(
            `UPDATE join_request SET status = 'REJECTED', responded_at = now()
              WHERE post_id = $1 AND status = 'PENDING' AND id <> $2`,
            [jr.post_id, jr.id]
          );
        }
        await addParticipant(c, bookingId, jr.kind === 'APPLY' ? jr.requester_user_id : req.user.id);
      }

      await c.query(`UPDATE join_request SET status = $2, responded_at = now() WHERE id = $1`, [jr.id, status]);

      const accepted = status === 'ACCEPTED';
      if (jr.kind === 'APPLY') {
        const captain = await c.query(`SELECT phone FROM app_user WHERE id = $1`, [req.user.id]);
        await repo.notify(c, {
          userId: jr.requester_user_id,
          type: accepted ? 'FREELANCE_ACCEPTED' : 'FREELANCE_REJECTED',
          title: accepted ? 'Bạn đã được nhận vào trận!' : 'Yêu cầu tham gia bị từ chối',
          body: accepted
            ? `${matchLabel(booking)} — ${booking.address}. SĐT đội trưởng: ${captain.rows[0]?.phone || 'chưa có'}`
            : `${myName} đã từ chối yêu cầu tham gia trận ${matchLabel(booking)}.`,
          bookingId,
        });
      } else {
        await repo.notify(c, {
          userId: jr.requester_user_id,
          type: accepted ? 'INVITE_ACCEPTED' : 'INVITE_REJECTED',
          title: accepted ? `${myName} đã nhận lời mời vào đội` : `${myName} từ chối lời mời`,
          body: matchLabel(booking),
          bookingId,
        });
      }
      return { id: jr.id, status };
    });
    if (out.expired) throw new AppError('INVITE_EXPIRED');
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// POST /api/freelance/matches/:code/leave  (người chơi lẻ hủy tham gia một trận đã được duyệt)
router.post('/matches/:code/leave', async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const b = await c.query(
        `SELECT b.id, b.user_id, v.name AS venue_name,
                (SELECT min(lower(time_range)) FROM booking_slot WHERE booking_id = b.id) AS start_at
           FROM booking b JOIN venue v ON v.id = b.venue_id WHERE b.code = $1`,
        [req.params.code]
      );
      if (b.rowCount === 0) throw new AppError('BOOKING_NOT_FOUND');
      const booking = b.rows[0];
      const part = await c.query(
        `UPDATE match_participant SET cancelled_at = now()
          WHERE booking_id = $1 AND user_id = $2 AND cancelled_at IS NULL RETURNING user_id`,
        [booking.id, req.user.id]
      );
      if (part.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Bạn không có trong danh sách trận này' });

      const minutesLeft = (new Date(booking.start_at) - new Date()) / 60000;
      if (minutesLeft <= 0) throw new AppError('BOOKING_ALREADY_STARTED');
      const late = minutesLeft < LATE_CANCEL_MINUTES;

      await c.query(
        `UPDATE join_request jr SET status = 'CANCELLED', responded_at = now()
          WHERE jr.status = 'ACCEPTED'
            AND ((jr.kind = 'APPLY' AND jr.requester_user_id = $2
                  AND jr.post_id IN (SELECT id FROM match_post WHERE booking_id = $1))
              OR (jr.kind = 'INVITE' AND jr.booking_id = $1
                  AND jr.post_id IN (SELECT id FROM match_post WHERE author_user_id = $2)))`,
        [booking.id, req.user.id]
      );

      // Trả lại chỗ trống cho bài tuyển; bùng sát giờ thì đẩy bài lên đầu danh sách
      await c.query(
        `UPDATE match_post SET slots_filled = GREATEST(slots_filled - 1, 0),
                status = CASE WHEN status = 'MATCHED' AND expires_at > now() THEN 'OPEN'::post_status ELSE status END,
                closed_at = CASE WHEN status = 'MATCHED' AND expires_at > now() THEN NULL ELSE closed_at END,
                bumped_at = CASE WHEN $2 THEN now() ELSE bumped_at END
          WHERE id = (SELECT id FROM match_post WHERE booking_id = $1 AND type = 'TEAM_FINDS_PLAYER'
                       AND status IN ('OPEN', 'MATCHED') ORDER BY id DESC LIMIT 1)`,
        [booking.id, late]
      );

      let reputation = null;
      if (late) {
        const r = await c.query(`SELECT fn_apply_reputation($1, $2::smallint, $3, 'BOOKING', $4) AS score`, [
          req.user.id,
          LATE_CANCEL_PENALTY,
          'Huy tham gia tran sat gio (< 1 tieng)',
          booking.id,
        ]);
        reputation = r.rows[0].score;
      }

      const me = await c.query(`SELECT full_name FROM user_profile WHERE user_id = $1`, [req.user.id]);
      await repo.notify(c, {
        userId: booking.user_id,
        type: 'FREELANCE_LEFT',
        title: `${me.rows[0]?.full_name || 'Một người chơi'} đã hủy tham gia trận`,
        body: `${matchLabel(booking)}. Bài tuyển người đã được mở lại${late ? ' và đẩy lên đầu danh sách' : ''}.`,
        bookingId: booking.id,
      });
      return { code: req.params.code, penalty: late ? -LATE_CANCEL_PENALTY : 0, reputation_score: reputation };
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// ------------------------------------------------------------------ Người chơi tìm đội

// GET /api/freelance/players?district=&period=&level=&page=&limit=
router.get('/players', async (req, res, next) => {
  try {
    const pg = paging(req.query);
    const rows = await repo.listPlayerPosts({
      viewerId: req.user.id,
      district: req.query.district || null,
      period: req.query.period || null,
      level: req.query.level || null,
      ...pg,
    });
    res.json(listResponse(rows, pg));
  } catch (e) {
    next(e);
  }
});

// POST /api/freelance/players
// body: { play_date: 'YYYY-MM-DD', start: 'HH:MM', end: 'HH:MM', district_codes[], positions[], level?, content? }
router.post('/players', async (req, res, next) => {
  try {
    requireFields(req.body, ['play_date', 'start', 'end', 'district_codes']);
    const { play_date } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(play_date)) {
      throw new AppError('INVALID_FIELD', { details: { field: 'play_date' } });
    }
    const s = parseTime(req.body.start);
    const e = parseTime(req.body.end);
    if (s === null || e === null || e <= s) throw new AppError('INVALID_TIME_RANGE');
    const districts = [...new Set([].concat(req.body.district_codes).filter(Boolean))].slice(0, 5);
    if (districts.length === 0) throw new AppError('MISSING_FIELD', { details: { missing: ['district_codes'] } });
    const positions = cleanPositions(req.body.positions);

    const post = await withTransaction(async (c) => {
      // Khóa theo người dùng để hai lần bấm đăng cùng lúc không lọt qua kiểm tra trùng giờ
      await c.query(`SELECT pg_advisory_xact_lock(hashtext('player_post:' || $1))`, [req.user.id]);

      const me = await c.query(`SELECT skill_level FROM user_profile WHERE user_id = $1`, [req.user.id]);
      const level = req.body.level || me.rows[0]?.skill_level || 'BEGINNER';
      checkLevel(level);

      const start = await c.query(`SELECT ($1 || ' ' || $2)::timestamptz AS at, ($1 || ' ' || $2)::timestamptz <= now() AS past`, [
        play_date,
        req.body.start,
      ]);
      if (start.rows[0].past) {
        throw new AppError('INVALID_TIME_RANGE', { message: 'Khung giờ rảnh phải ở thời điểm sắp tới' });
      }

      const known = await c.query(`SELECT count(*)::int AS n FROM district WHERE code = ANY($1::varchar[])`, [
        districts,
      ]);
      if (known.rows[0].n !== districts.length) {
        throw new AppError('INVALID_FIELD', { details: { field: 'district_codes' } });
      }

      const overlap = await c.query(
        `SELECT 1 FROM match_post
          WHERE author_user_id = $1 AND type = 'PLAYER_FINDS_TEAM' AND status = 'OPEN'
            AND play_date = $2 AND time_span && int4range($3, $4)`,
        [req.user.id, play_date, s, e]
      );
      if (overlap.rowCount > 0) throw new AppError('PLAYER_POST_OVERLAP');

      const r = await c.query(
        `INSERT INTO match_post (type, author_user_id, district_code, district_codes, play_date, time_span,
                                 required_level, positions, content, expires_at)
         VALUES ('PLAYER_FINDS_TEAM', $1, $2, $3::varchar[], $4, int4range($5, $6), $7,
                 $8::position_type[], $9, $10)
         RETURNING id, status, play_date, time_span::text AS time_span, expires_at`,
        [
          req.user.id,
          districts[0],
          districts,
          play_date,
          s,
          e,
          level,
          positions,
          req.body.content ? String(req.body.content).slice(0, 500) : null,
          start.rows[0].at,
        ]
      );
      return r.rows[0];
    });
    res.status(201).json({ data: post });
  } catch (err) {
    next(err);
  }
});

// POST /api/freelance/players/:id/invite  body: { booking_code, message? }
router.post('/players/:id/invite', async (req, res, next) => {
  try {
    requireFields(req.body, ['booking_code']);
    const out = await withTransaction(async (c) => {
      const p = await c.query(
        `SELECT id, author_user_id, status, expires_at FROM match_post
          WHERE id = $1 AND type = 'PLAYER_FINDS_TEAM' FOR UPDATE`,
        [req.params.id]
      );
      if (p.rowCount === 0) throw new AppError('POST_NOT_FOUND');
      const post = p.rows[0];
      if (post.author_user_id === req.user.id) {
        throw new AppError('INVALID_OPERATION', { message: 'Không thể tự mời chính mình' });
      }
      if (post.status !== 'OPEN' || new Date(post.expires_at) <= new Date()) throw new AppError('POST_NOT_OPEN');

      const booking = await loadOwnUpcomingBooking(c, { code: req.body.booking_code, userId: req.user.id });
      const inMatch = await c.query(
        `SELECT 1 FROM match_participant WHERE booking_id = $1 AND user_id = $2 AND cancelled_at IS NULL`,
        [booking.id, post.author_user_id]
      );
      if (inMatch.rowCount > 0) {
        throw new AppError('ALREADY_IN_MATCH', { message: 'Người chơi này đã có trong danh sách trận' });
      }

      const team = await c.query(`SELECT id, name FROM team WHERE captain_id = $1`, [req.user.id]);
      const message = req.body.message ? String(req.body.message).slice(0, 300) : null;
      const existing = await c.query(
        `SELECT id, status, expires_at FROM join_request WHERE post_id = $1 AND requester_user_id = $2`,
        [post.id, req.user.id]
      );
      let invite;
      const fields = [booking.id, message, team.rows[0]?.id || null, INVITE_MINUTES];
      if (existing.rowCount > 0) {
        const ex = existing.rows[0];
        const live = ex.status === 'PENDING' && new Date(ex.expires_at) > new Date();
        if (live || ex.status === 'ACCEPTED') throw new AppError('REQUEST_ALREADY_EXISTS');
        invite = await c.query(
          `UPDATE join_request SET status = 'PENDING', kind = 'INVITE', booking_id = $2, message = $3,
                  requester_team_id = $4, expires_at = now() + make_interval(mins => $5),
                  responded_at = NULL, created_at = now()
            WHERE id = $1 RETURNING id, status, expires_at`,
          [ex.id, ...fields]
        );
      } else {
        invite = await c.query(
          `INSERT INTO join_request (post_id, requester_user_id, kind, booking_id, message, requester_team_id, expires_at)
           VALUES ($1, $2, 'INVITE', $3, $4, $5, now() + make_interval(mins => $6))
           RETURNING id, status, expires_at`,
          [post.id, req.user.id, ...fields]
        );
      }

      const recruit = await c.query(
        `SELECT cost_kind, cost_amount FROM match_post
          WHERE booking_id = $1 AND type = 'TEAM_FINDS_PLAYER' ORDER BY id DESC LIMIT 1`,
        [booking.id]
      );
      const cost = recruit.rows[0];
      const costText = !cost
        ? ''
        : cost.cost_kind === 'FREE'
          ? ' · Miễn phí'
          : cost.cost_kind === 'FIXED'
            ? ` · ${Number(cost.cost_amount).toLocaleString('vi-VN')}đ/người`
            : ' · Đóng tự nguyện';
      await repo.notify(c, {
        userId: post.author_user_id,
        type: 'FREELANCE_INVITE',
        title: `${team.rows[0]?.name || 'Một đội bóng'} mời bạn vào đội`,
        body: `${matchLabel(booking)}${costText}. Phản hồi trong ${INVITE_MINUTES} phút.`,
        bookingId: booking.id,
      });
      return invite.rows[0];
    });
    res.status(201).json({ data: out });
  } catch (e) {
    next(e);
  }
});

// GET /api/freelance/me  (bài đăng, yêu cầu, lời mời của chính mình)
router.get('/me', async (req, res, next) => {
  try {
    res.json(await repo.getMine(req.user.id));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
