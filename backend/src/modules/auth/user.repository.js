'use strict';
const { query, withTransaction } = require('../../db');

/** Tim tai khoan theo SDT, tra ve ca password_hash (dung noi bo de so sanh dang nhap) */
async function findByPhone(phone) {
  const r = await query(
    `SELECT u.*, p.full_name, p.district_code, p.skill_level
       FROM app_user u LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE u.phone = $1`, [phone]);
  return r.rows[0] || null;
}

async function findById(id) {
  const r = await query(
    `SELECT u.*, p.full_name, p.district_code, p.skill_level
       FROM app_user u LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE u.id = $1`, [id]);
  return r.rows[0] || null;
}

/** Tao app_user + user_profile trong 1 giao dich */
async function createUserWithProfile({ phone, passwordHash, fullName, districtCode }) {
  return withTransaction(async (c) => {
    const u = await c.query(
      `INSERT INTO app_user (phone, password_hash) VALUES ($1, $2) RETURNING *`,
      [phone, passwordHash]);
    const user = u.rows[0];

    const p = await c.query(
      `INSERT INTO user_profile (user_id, full_name, district_code)
       VALUES ($1, $2, $3) RETURNING full_name, district_code, skill_level`,
      [user.id, fullName, districtCode || null]);

    return { ...user, ...p.rows[0] };
  });
}

async function touchLastLogin(userId) {
  await query(`UPDATE app_user SET last_login_at = now() WHERE id = $1`, [userId]);
}

module.exports = { findByPhone, findById, createUserWithProfile, touchLastLogin };
