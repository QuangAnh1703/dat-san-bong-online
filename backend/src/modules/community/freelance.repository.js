'use strict';
const { query } = require('../../db');

const SKILL_RANK = { BEGINNER: 1, INTERMEDIATE: 2, GOOD: 3, SEMI_PRO: 4 };
const SKILL_LABEL = { BEGINNER: 'Mới chơi', INTERMEDIATE: 'Trung bình', GOOD: 'Khá', SEMI_PRO: 'Phủi' };
const POSITIONS = ['GK', 'DF', 'MF', 'FW', 'ANY'];
const COST_KINDS = ['FREE', 'FIXED', 'VOLUNTARY'];

// Khung giờ theo phút trong ngày của lower(time_span)
const PERIODS = {
  morning: [0, 720],
  afternoon: [720, 1080],
  evening: [1080, 1440],
};

async function notify(db, { userId, type, title, body, bookingId }) {
  await db.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, type, title.slice(0, 200), body ? body.slice(0, 500) : null, bookingId ? 'BOOKING' : null, bookingId || null]
  );
}

function addPeriodFilter(where, params, period) {
  const range = PERIODS[period];
  if (!range) return;
  params.push(range[0], range[1]);
  where.push(`lower(mp.time_span) >= $${params.length - 1} AND lower(mp.time_span) < $${params.length}`);
}

async function listRecruits({ viewerId, district, period, level, cost, page, limit }) {
  const params = [viewerId || null];
  const where = [`mp.type = 'TEAM_FINDS_PLAYER'`, `mp.status = 'OPEN'`, `mp.expires_at > now()`];
  if (district) {
    params.push(district);
    where.push(`mp.district_code = $${params.length}`);
  }
  if (level) {
    params.push(level);
    where.push(`mp.required_level = $${params.length}`);
  }
  if (cost) {
    params.push(cost);
    where.push(`mp.cost_kind = $${params.length}`);
  }
  addPeriodFilter(where, params, period);
  params.push(limit, (page - 1) * limit);

  const r = await query(
    `SELECT mp.id, mp.status, mp.author_user_id, mp.play_date, mp.time_span::text AS time_span,
            mp.required_level, mp.slots_needed, mp.slots_filled, mp.cost_kind, mp.cost_amount,
            mp.positions::text[] AS positions, mp.content, mp.expires_at, mp.bumped_at, mp.created_at,
            mp.district_code, d.name AS district_name,
            t.name AS team_name, COALESCE(up.full_name, 'Thanh vien #' || mp.author_user_id) AS author_name,
            v.name AS venue_name, f.name AS field_name,
            (SELECT jr.status FROM join_request jr
              WHERE jr.post_id = mp.id AND jr.requester_user_id = $1) AS my_request_status,
            CASE WHEN mp.author_user_id = $1 THEN
              (SELECT count(*) FROM join_request jr WHERE jr.post_id = mp.id AND jr.status = 'PENDING')
            END AS pending_requests,
            count(*) OVER () AS total
       FROM match_post mp
       JOIN booking b ON b.id = mp.booking_id
       JOIN venue v ON v.id = b.venue_id
       LEFT JOIN district d ON d.code = mp.district_code
       LEFT JOIN team t ON t.id = mp.team_id
       LEFT JOIN user_profile up ON up.user_id = mp.author_user_id
       LEFT JOIN LATERAL (
         SELECT fi.name FROM booking_slot bs JOIN field fi ON fi.id = bs.field_id
          WHERE bs.booking_id = b.id ORDER BY lower(bs.time_range) LIMIT 1
       ) f ON TRUE
      WHERE ${where.join(' AND ')}
      ORDER BY mp.bumped_at DESC NULLS LAST, mp.play_date, lower(mp.time_span), mp.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return r.rows;
}

async function listPlayerPosts({ viewerId, district, period, level, page, limit }) {
  const params = [viewerId || null];
  const where = [`mp.type = 'PLAYER_FINDS_TEAM'`, `mp.status = 'OPEN'`, `mp.expires_at > now()`];
  if (district) {
    params.push(district);
    where.push(`($${params.length} = ANY(mp.district_codes) OR mp.district_code = $${params.length})`);
  }
  if (level) {
    params.push(level);
    where.push(`mp.required_level = $${params.length}`);
  }
  addPeriodFilter(where, params, period);
  params.push(limit, (page - 1) * limit);

  const r = await query(
    `SELECT mp.id, mp.status, mp.author_user_id, mp.play_date, mp.time_span::text AS time_span,
            mp.required_level, mp.positions::text[] AS positions, mp.content, mp.expires_at, mp.created_at,
            COALESCE(mp.district_codes, ARRAY[mp.district_code])::text[] AS district_codes,
            COALESCE(up.full_name, 'Thanh vien #' || mp.author_user_id) AS author_name,
            up.reputation_score, up.total_matches,
            (SELECT jr.status FROM join_request jr
              WHERE jr.post_id = mp.id AND jr.requester_user_id = $1) AS my_invite_status,
            count(*) OVER () AS total
       FROM match_post mp
       LEFT JOIN user_profile up ON up.user_id = mp.author_user_id
      WHERE ${where.join(' AND ')}
      ORDER BY mp.play_date, lower(mp.time_span), mp.id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return r.rows;
}

// Hồ sơ người xin vào bài tuyển: điểm uy tín, vị trí sở trường, trình độ.
// SĐT chỉ lộ ra khi đã được chấp nhận.
async function listRequestsForPost(postId) {
  const r = await query(
    `SELECT jr.id, jr.kind, jr.status, jr.message, jr.level_warning_ack, jr.created_at,
            jr.requester_user_id,
            COALESCE(up.full_name, 'Thanh vien #' || jr.requester_user_id) AS requester_name,
            up.skill_level, up.preferred_position, up.reputation_score, up.total_matches,
            CASE WHEN jr.status = 'ACCEPTED' THEN u.phone END AS requester_phone
       FROM join_request jr
       JOIN app_user u ON u.id = jr.requester_user_id
       LEFT JOIN user_profile up ON up.user_id = jr.requester_user_id
      WHERE jr.post_id = $1
      ORDER BY (jr.status = 'PENDING') DESC, jr.created_at DESC`,
    [postId]
  );
  return r.rows;
}

const MATCH_COLUMNS = `
  b.code AS booking_code, v.name AS venue_name, v.address AS venue_address,
  lower(s.time_range) AS start_at, upper(s.time_range) AS end_at, s.field_name`;

const MATCH_JOINS = `
  JOIN venue v ON v.id = b.venue_id
  LEFT JOIN LATERAL (
    SELECT bs.time_range, fi.name AS field_name FROM booking_slot bs JOIN field fi ON fi.id = bs.field_id
     WHERE bs.booking_id = b.id ORDER BY lower(bs.time_range) LIMIT 1
  ) s ON TRUE`;

async function getMine(userId) {
  const [recruits, playerPosts, applications, invites] = await Promise.all([
    query(
      `SELECT mp.id, mp.status, mp.slots_needed, mp.slots_filled, mp.required_level, mp.cost_kind, mp.cost_amount,
              mp.positions::text[] AS positions, mp.content, mp.expires_at, mp.time_span::text AS time_span,
              mp.play_date, ${MATCH_COLUMNS},
              (SELECT count(*) FROM join_request jr WHERE jr.post_id = mp.id AND jr.status = 'PENDING') AS pending_requests
         FROM match_post mp
         JOIN booking b ON b.id = mp.booking_id
         ${MATCH_JOINS}
        WHERE mp.type = 'TEAM_FINDS_PLAYER' AND mp.author_user_id = $1
          AND mp.play_date >= CURRENT_DATE - 7
        ORDER BY (mp.status = 'OPEN') DESC, mp.play_date DESC, mp.id DESC`,
      [userId]
    ),
    query(
      `SELECT mp.id, mp.status, mp.play_date, mp.time_span::text AS time_span, mp.required_level,
              mp.positions::text[] AS positions, mp.content, mp.expires_at,
              COALESCE(mp.district_codes, ARRAY[mp.district_code])::text[] AS district_codes
         FROM match_post mp
        WHERE mp.type = 'PLAYER_FINDS_TEAM' AND mp.author_user_id = $1
          AND mp.play_date >= CURRENT_DATE - 7
        ORDER BY (mp.status = 'OPEN') DESC, mp.play_date DESC, mp.id DESC`,
      [userId]
    ),
    // Yêu cầu mình đã gửi vào bài tuyển của đội; được chấp nhận thì kèm địa chỉ sân và SĐT đội trưởng
    query(
      `SELECT jr.id, jr.status, jr.message, jr.created_at, mp.id AS post_id, mp.cost_kind, mp.cost_amount,
              t.name AS team_name, COALESCE(up.full_name, 'Thanh vien #' || mp.author_user_id) AS captain_name,
              CASE WHEN jr.status = 'ACCEPTED' THEN u.phone END AS captain_phone,
              ${MATCH_COLUMNS}
         FROM join_request jr
         JOIN match_post mp ON mp.id = jr.post_id
         JOIN booking b ON b.id = mp.booking_id
         JOIN app_user u ON u.id = mp.author_user_id
         LEFT JOIN user_profile up ON up.user_id = mp.author_user_id
         LEFT JOIN team t ON t.id = mp.team_id
         ${MATCH_JOINS}
        WHERE jr.kind = 'APPLY' AND jr.requester_user_id = $1 AND mp.play_date >= CURRENT_DATE - 7
        ORDER BY jr.created_at DESC`,
      [userId]
    ),
    // Lời mời: nhận được (trên bài tìm đội của mình) và đã gửi (mình là đội trưởng)
    query(
      `SELECT jr.id, jr.status, jr.message, jr.expires_at, jr.created_at, jr.post_id,
              (jr.requester_user_id = $1) AS sent_by_me,
              t.name AS team_name, COALESCE(cap.full_name, 'Thanh vien #' || jr.requester_user_id) AS captain_name,
              CASE WHEN jr.status = 'ACCEPTED' THEN cu.phone END AS captain_phone,
              COALESCE(pl.full_name, 'Thanh vien #' || mp.author_user_id) AS player_name,
              rp.cost_kind, rp.cost_amount,
              ${MATCH_COLUMNS}
         FROM join_request jr
         JOIN match_post mp ON mp.id = jr.post_id
         JOIN booking b ON b.id = jr.booking_id
         JOIN app_user cu ON cu.id = jr.requester_user_id
         LEFT JOIN user_profile cap ON cap.user_id = jr.requester_user_id
         LEFT JOIN user_profile pl ON pl.user_id = mp.author_user_id
         LEFT JOIN team t ON t.id = jr.requester_team_id
         LEFT JOIN LATERAL (
           SELECT cost_kind, cost_amount FROM match_post
            WHERE booking_id = b.id AND type = 'TEAM_FINDS_PLAYER' ORDER BY id DESC LIMIT 1
         ) rp ON TRUE
         ${MATCH_JOINS}
        WHERE jr.kind = 'INVITE' AND (mp.author_user_id = $1 OR jr.requester_user_id = $1)
          AND mp.play_date >= CURRENT_DATE - 7
        ORDER BY (jr.status = 'PENDING') DESC, jr.created_at DESC`,
      [userId]
    ),
  ]);
  return {
    recruits: recruits.rows,
    player_posts: playerPosts.rows,
    applications: applications.rows,
    invites: invites.rows,
  };
}

// Chạy định kỳ (server.js): đóng bài quá giờ bóng lăn, hết hạn lời mời 30 phút
async function expireFreelance(db) {
  const posts = await db.query(
    `UPDATE match_post SET status = 'EXPIRED', closed_at = now()
      WHERE status = 'OPEN' AND expires_at < now()
      RETURNING id, type, author_user_id, booking_id, slots_needed, slots_filled`
  );
  for (const p of posts.rows) {
    if (p.type === 'TEAM_FINDS_PLAYER' && p.slots_filled < p.slots_needed) {
      await notify(db, {
        userId: p.author_user_id,
        type: 'RECRUIT_EXPIRED',
        title: 'Bài tuyển người đã hết hạn tuyển',
        body: `Đến giờ bóng lăn nhưng đội mới tuyển được ${p.slots_filled}/${p.slots_needed} người.`,
        bookingId: p.booking_id,
      });
    }
  }

  const invites = await db.query(
    `UPDATE join_request SET status = 'EXPIRED', responded_at = now()
      WHERE kind = 'INVITE' AND status = 'PENDING' AND expires_at < now()
      RETURNING requester_user_id, booking_id`
  );
  for (const i of invites.rows) {
    await notify(db, {
      userId: i.requester_user_id,
      type: 'INVITE_EXPIRED',
      title: 'Lời mời vào đội đã hết hạn',
      body: 'Người chơi không phản hồi sau 30 phút. Hãy mời người khác.',
      bookingId: i.booking_id,
    });
  }

  await db.query(
    `UPDATE join_request jr SET status = 'EXPIRED', responded_at = now()
       FROM match_post mp
      WHERE mp.id = jr.post_id AND jr.status = 'PENDING' AND mp.status IN ('EXPIRED', 'CLOSED')`
  );
  return posts.rowCount + invites.rowCount;
}

module.exports = {
  SKILL_RANK,
  SKILL_LABEL,
  POSITIONS,
  COST_KINDS,
  notify,
  listRecruits,
  listPlayerPosts,
  listRequestsForPost,
  getMine,
  expireFreelance,
};
