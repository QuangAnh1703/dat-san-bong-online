'use strict';
const { query, withTransaction } = require('../../db');

// Tạo yêu cầu nâng cấp từ PLAYER → OWNER
async function createOwnerRequest(userId) {
  const r = await query(
    `INSERT INTO owner_request (user_id, status)
     VALUES ($1, 'PENDING')
     RETURNING *`,
    [userId]
  );
  return r.rows[0] || null;
}

// Tìm yêu cầu owner hiện tại của user
async function findPendingOwnerRequest(userId) {
  const r = await query(
    `SELECT * FROM owner_request
     WHERE user_id = $1 AND status = 'PENDING'`,
    [userId]
  );
  return r.rows[0] || null;
}

// Lấy danh sách yêu cầu pending (admin)
async function listPendingOwnerRequests(limit = 20, offset = 0) {
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
  return r.rows;
}

// Lấy tổng số yêu cầu pending
async function countPendingOwnerRequests() {
  const r = await query(
    `SELECT COUNT(*) as count FROM owner_request WHERE status = 'PENDING'`
  );
  return r.rows[0]?.count || 0;
}

// Phê duyệt yêu cầu owner (admin)
async function approveOwnerRequest(requestId, adminId) {
  return withTransaction(async (c) => {
    // Lấy thông tin yêu cầu
    const req = await c.query(
      `SELECT * FROM owner_request WHERE id = $1`,
      [requestId]
    );

    if (req.rowCount === 0) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    const ownerReq = req.rows[0];
    const userId = ownerReq.user_id;

    // Cập nhật role người dùng
    await c.query(
      `UPDATE app_user SET role = 'OWNER' WHERE id = $1`,
      [userId]
    );

    // Cập nhật trạng thái yêu cầu
    const result = await c.query(
      `UPDATE owner_request
       SET status = 'APPROVED', reviewed_at = now(), reviewed_by = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [adminId, requestId]
    );

    return result.rows[0];
  });
}

// Từ chối yêu cầu owner (admin)
async function rejectOwnerRequest(requestId, adminId, reason) {
  const r = await query(
    `UPDATE owner_request
     SET status = 'REJECTED', rejection_reason = $1,
         reviewed_at = now(), reviewed_by = $2, updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [reason, adminId, requestId]
  );
  return r.rows[0] || null;
}

// Lấy thông tin yêu cầu
async function getOwnerRequest(requestId) {
  const r = await query(
    `SELECT
       or.*,
       u.email, u.phone,
       p.full_name
     FROM owner_request or
     JOIN app_user u ON u.id = or.user_id
     LEFT JOIN user_profile p ON p.user_id = u.id
     WHERE or.id = $1`,
    [requestId]
  );
  return r.rows[0] || null;
}

module.exports = {
  createOwnerRequest,
  findPendingOwnerRequest,
  listPendingOwnerRequests,
  countPendingOwnerRequests,
  approveOwnerRequest,
  rejectOwnerRequest,
  getOwnerRequest,
};
