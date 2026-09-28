'use strict';
const { query, withTransaction } = require('../../db');
const { AppError } = require('../../lib/errors');

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
      type, author_user_id, team_id, booking_id, district_code, play_date,
      time_span, required_level, deal_note, slots_needed, cost_kind,
      cost_amount, content, expires_at,
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
  limit = 20,
  offset = 0,
}) {
  let sql = `SELECT * FROM match_post WHERE 1=1`;
  const params = [];
  let paramIdx = 1;

  if (type) {
    sql += ` AND type = $${paramIdx++}`;
    params.push(type);
  }

  if (status) {
    sql += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  if (district_code) {
    sql += ` AND district_code = $${paramIdx++}`;
    params.push(district_code);
  }

  if (play_date_from) {
    sql += ` AND play_date >= $${paramIdx++}`;
    params.push(play_date_from);
  }

  if (play_date_to) {
    sql += ` AND play_date <= $${paramIdx++}`;
    params.push(play_date_to);
  }

  if (required_level) {
    sql += ` AND required_level = $${paramIdx++}`;
    params.push(required_level);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

async function getPostById(id) {
  const result = await query(
    `SELECT mp.*,
            json_agg(json_build_object('id', jr.id, 'requester_user_id', jr.requester_user_id, 'status', jr.status)) FILTER (WHERE jr.id IS NOT NULL) AS requests
     FROM match_post mp
     LEFT JOIN join_request jr ON jr.post_id = mp.id
     WHERE mp.id = $1
     GROUP BY mp.id`,
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

async function createJoinRequest({
  post_id,
  requester_user_id,
  requester_team_id,
  message,
}) {
  const result = await query(
    `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [post_id, requester_user_id, requester_team_id, message]
  );
  return result.rows[0];
}

async function listJoinRequests({ post_id, requester_user_id, status, limit = 20, offset = 0 }) {
  let sql = `SELECT * FROM join_request WHERE 1=1`;
  const params = [];
  let paramIdx = 1;

  if (post_id) {
    sql += ` AND post_id = $${paramIdx++}`;
    params.push(post_id);
  }

  if (requester_user_id) {
    sql += ` AND requester_user_id = $${paramIdx++}`;
    params.push(requester_user_id);
  }

  if (status) {
    sql += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
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
