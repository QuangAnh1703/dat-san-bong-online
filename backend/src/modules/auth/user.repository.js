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

async function findByEmail(email) {
  const r = await query(
    `SELECT u.*, p.full_name, p.district_code, p.skill_level
       FROM app_user u LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE LOWER(u.email) = LOWER($1)`, [email]);
  return r.rows[0] || null;
}

async function findById(id) {
  const r = await query(
    `SELECT u.*, p.full_name, p.district_code, p.skill_level
       FROM app_user u LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE u.id = $1`, [id]);
  return r.rows[0] || null;
}

/** Tao app_user + user_profile trong 1 giao dich - dung phone */
async function createUserWithProfile({ phone, passwordHash, fullName, districtCode, role = 'PLAYER' }) {
  return withTransaction(async (c) => {
    const u = await c.query(
      `INSERT INTO app_user (phone, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
      [phone, passwordHash, role]);
    const user = u.rows[0];

    const p = await c.query(
      `INSERT INTO user_profile (user_id, full_name, district_code)
       VALUES ($1, $2, $3) RETURNING full_name, district_code, skill_level`,
      [user.id, fullName, districtCode || null]);

    return { ...user, ...p.rows[0] };
  });
}

/** Tao app_user + user_profile trong 1 giao dich - dung email */
async function createUserWithEmail({ email, passwordHash, fullName, districtCode, role = 'PLAYER' }) {
  return withTransaction(async (c) => {
    const u = await c.query(
      `INSERT INTO app_user (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
      [email.toLowerCase(), passwordHash, role]);
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

/** Tao app_user + user_profile + oauth_account trong 1 giao dich */
async function createUserWithOAuth({ email, fullName, provider, providerId, role = 'PLAYER' }) {
  return withTransaction(async (c) => {
    const u = await c.query(
      `INSERT INTO app_user (email, role) VALUES ($1, $2) RETURNING *`,
      [email.toLowerCase(), role]);
    const user = u.rows[0];

    await c.query(
      `INSERT INTO user_profile (user_id, full_name)
       VALUES ($1, $2)`,
      [user.id, fullName]);

    await c.query(
      `INSERT INTO oauth_account (user_id, provider, provider_uid)
       VALUES ($1, $2, $3)`,
      [user.id, provider, providerId]);

    const p = await c.query(
      `SELECT full_name, district_code, skill_level FROM user_profile WHERE user_id = $1`,
      [user.id]);

    return { ...user, ...p.rows[0] };
  });
}

/** Them OAuth account vao user co san */
async function linkOAuthAccount(userId, provider, providerId) {
  await query(
    `INSERT INTO oauth_account (user_id, provider, provider_uid)
     VALUES ($1, $2, $3)`,
    [userId, provider, providerId]);
}

/** Kiem tra xem user da co OAuth account chua */
async function findOAuthAccount(userId, provider, providerId) {
  const r = await query(
    `SELECT * FROM oauth_account WHERE user_id = $1 AND provider = $2 AND provider_uid = $3`,
    [userId, provider, providerId]);
  return r.rows[0] || null;
}

module.exports = { findByPhone, findByEmail, findById, createUserWithProfile, createUserWithEmail, touchLastLogin, createUserWithOAuth, linkOAuthAccount, findOAuthAccount };
