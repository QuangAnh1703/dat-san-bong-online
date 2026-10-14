'use strict';
const { query } = require('../../db');

async function createPost({
  type,
  author_user_id,
  team_id,
  booking_id,
  district_code,
  play_date,
  time_span,
  required_level,
  deal_note,
  slots_needed,
  cost_kind,
  cost_amount,
  content,
  expires_at,
}) {
  const result = await query(
    `INSERT INTO match_post (
      type, author_user_id, team_id, booking_id, district_code, play_date,
      time_span, required_level, deal_note, slots_needed, cost_kind,
      cost_amount, content, expires_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
    RETURNING *`,
    [
      type,
      author_user_id,
      team_id,
      booking_id,
      district_code,
      play_date,
      time_span,
      required_level,
      deal_note,
      slots_needed,
      cost_kind,
      cost_amount,
      content,
      expires_at,
    ]
  );
  return result.rows[0];
}

async function listPosts({
  type,
  status = 'OPEN',
  district_code,
  play_date_from,
  play_date_to,
  required_level,
  viewer_id,
  limit = 20,
  offset = 0,
}) {
  // Kem ten doi/nguoi dang/san va trang thai loi moi cua nguoi xem de UI khong phai goi them
  const params = [viewer_id || null];
  let sql = `SELECT mp.*,
                    t.name AS team_name, t.member_count AS team_member_count,
                    COALESCE(up.full_name, 'Thanh vien #' || mp.author_user_id) AS author_name,
                    d.name AS district_name,
                    v.id AS venue_id, v.name AS venue_name, f.name AS field_name, f.type AS field_type,
                    (SELECT count(*) FROM join_request jr WHERE jr.post_id = mp.id AND jr.status = 'PENDING') AS pending_requests,
                    (SELECT jr.status FROM join_request jr
                      WHERE jr.post_id = mp.id AND jr.requester_user_id = $1) AS my_request_status
               FROM match_post mp
               LEFT JOIN team t ON t.id = mp.team_id
               LEFT JOIN user_profile up ON up.user_id = mp.author_user_id
               LEFT JOIN district d ON d.code = mp.district_code
               LEFT JOIN booking b ON b.id = mp.booking_id
               LEFT JOIN venue v ON v.id = b.venue_id
               LEFT JOIN LATERAL (
                 SELECT fi.name, fi.type FROM booking_slot bs JOIN field fi ON fi.id = bs.field_id
                  WHERE bs.booking_id = b.id ORDER BY lower(bs.time_range) LIMIT 1
               ) f ON TRUE
              WHERE 1=1`;
  let paramIdx = 2;

  if (type) {
    sql += ` AND mp.type = $${paramIdx++}`;
    params.push(type);
  }

  if (status) {
    sql += ` AND mp.status = $${paramIdx++}`;
    params.push(status);
  }

  if (district_code) {
    sql += ` AND mp.district_code = $${paramIdx++}`;
    params.push(district_code);
  }

  if (play_date_from) {
    sql += ` AND mp.play_date >= $${paramIdx++}`;
    params.push(play_date_from);
  }

  if (play_date_to) {
    sql += ` AND mp.play_date <= $${paramIdx++}`;
    params.push(play_date_to);
  }

  if (required_level) {
    sql += ` AND mp.required_level = $${paramIdx++}`;
    params.push(required_level);
  }

  sql += ` ORDER BY mp.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

async function getPostById(id) {
  const result = await query(
    `SELECT mp.id, mp.type, mp.status, mp.author_user_id, mp.team_id, mp.booking_id,
            mp.district_code, mp.play_date, mp.time_span, mp.required_level, mp.deal_note,
            mp.slots_needed, mp.slots_filled, mp.cost_kind, mp.cost_amount, mp.content,
            mp.expires_at, mp.created_at, mp.closed_at,
            json_agg(json_build_object('id', jr.id, 'requester_user_id', jr.requester_user_id, 'status', jr.status)) FILTER (WHERE jr.id IS NOT NULL) AS requests
     FROM match_post mp
     LEFT JOIN join_request jr ON jr.post_id = mp.id
     WHERE mp.id = $1
     GROUP BY mp.id, mp.type, mp.status, mp.author_user_id, mp.team_id, mp.booking_id,
              mp.district_code, mp.play_date, mp.time_span, mp.required_level, mp.deal_note,
              mp.slots_needed, mp.slots_filled, mp.cost_kind, mp.cost_amount, mp.content,
              mp.expires_at, mp.created_at, mp.closed_at`,
    [id]
  );
  return result.rows[0];
}

async function updatePost(id, updates) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const sql = `UPDATE match_post SET ${fields.join(', ')}, updated_at = now() WHERE id = $${paramIdx} RETURNING *`;

  const result = await query(sql, values);
  return result.rows[0];
}

async function createJoinRequest({ post_id, requester_user_id, requester_team_id, message }) {
  const result = await query(
    `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [post_id, requester_user_id, requester_team_id, message]
  );
  return result.rows[0];
}

async function listJoinRequests({ post_id, requester_user_id, status, limit = 20, offset = 0 }) {
  let sql = `SELECT jr.*, up.full_name AS requester_name, u.phone AS requester_phone,
                    t.name AS requester_team_name
               FROM join_request jr
               JOIN app_user u ON u.id = jr.requester_user_id
               LEFT JOIN user_profile up ON up.user_id = jr.requester_user_id
               LEFT JOIN team t ON t.id = jr.requester_team_id
              WHERE 1=1`;
  const params = [];
  let paramIdx = 1;

  if (post_id) {
    sql += ` AND jr.post_id = $${paramIdx++}`;
    params.push(post_id);
  }

  if (requester_user_id) {
    sql += ` AND jr.requester_user_id = $${paramIdx++}`;
    params.push(requester_user_id);
  }

  if (status) {
    sql += ` AND jr.status = $${paramIdx++}`;
    params.push(status);
  }

  sql += ` ORDER BY jr.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

async function getJoinRequestById(id) {
  const result = await query(`SELECT * FROM join_request WHERE id = $1`, [id]);
  return result.rows[0];
}

async function updateJoinRequest(id, { status, responded_at }) {
  const result = await query(
    `UPDATE join_request SET status = $1, responded_at = $2 WHERE id = $3 RETURNING *`,
    [status, responded_at || new Date(), id]
  );
  return result.rows[0];
}

async function getConversation(post_id) {
  const result = await query(`SELECT * FROM conversation WHERE match_post_id = $1`, [post_id]);
  return result.rows[0];
}

async function createConversation({ match_post_id, booking_id }) {
  const result = await query(
    `INSERT INTO conversation (match_post_id, booking_id, created_at) VALUES ($1, $2, now()) RETURNING *`,
    [match_post_id, booking_id]
  );
  return result.rows[0];
}

async function addConversationMember({ conversation_id, user_id }) {
  const result = await query(
    `INSERT INTO conversation_member (conversation_id, user_id, joined_at) VALUES ($1, $2, now())
     ON CONFLICT DO NOTHING RETURNING *`,
    [conversation_id, user_id]
  );
  return result.rows[0];
}

async function listMessages({ conversation_id, limit = 50, offset = 0 }) {
  const result = await query(
    `SELECT * FROM message WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [conversation_id, limit, offset]
  );
  return result.rows.reverse();
}

async function createMessage({ conversation_id, sender_id, content }) {
  const result = await query(
    `INSERT INTO message (conversation_id, sender_id, content, created_at) VALUES ($1, $2, $3, now()) RETURNING *`,
    [conversation_id, sender_id, content]
  );
  return result.rows[0];
}

async function getUserProfile(user_id) {
  const result = await query(
    `SELECT up.*, a.skill_level, a.preferred_position, a.reputation_score, a.total_matches
     FROM user_profile up
     JOIN app_user a ON a.id = up.user_id
     WHERE up.user_id = $1`,
    [user_id]
  );
  return result.rows[0];
}

async function getTeamDetails(team_id) {
  const result = await query(
    `SELECT t.*, COUNT(tm.user_id) AS member_count
     FROM team t
     LEFT JOIN team_member tm ON tm.team_id = t.id
     WHERE t.id = $1
     GROUP BY t.id`,
    [team_id]
  );
  return result.rows[0];
}

async function getTeamMembers(team_id) {
  const result = await query(
    `SELECT up.*, a.id, a.role FROM user_profile up
     JOIN team_member tm ON tm.user_id = up.user_id
     JOIN app_user a ON a.id = up.user_id
     WHERE tm.team_id = $1`,
    [team_id]
  );
  return result.rows;
}

module.exports = {
  createPost,
  listPosts,
  getPostById,
  updatePost,
  createJoinRequest,
  listJoinRequests,
  getJoinRequestById,
  updateJoinRequest,
  getConversation,
  createConversation,
  addConversationMember,
  listMessages,
  createMessage,
  getUserProfile,
  getTeamDetails,
  getTeamMembers,
};
