'use strict';
/**
 * Tao (hoac cap nhat) tai khoan quan tri de dang nhap bang email + mat khau.
 *
 *   npm run create-admin -- <email> <mat_khau> [ho_ten]
 *
 * Chay lai voi cung email thi dat lai mat khau va dua tai khoan ve ADMIN/ACTIVE.
 * Khong dua tai khoan admin vao migration: migration chay ca tren moi truong that,
 * mat khau mac dinh nam trong repo se thanh lo hong.
 */
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const [email, password, fullName = 'Quản trị viên'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Cach dung: npm run create-admin -- <email> <mat_khau> [ho_ten]');
    process.exit(1);
  }
  if (!EMAIL_RE.test(email)) throw new Error('Email khong hop le');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Mat khau phai co it nhat 8 ky tu, gom ca chu va so');
  }

  const hash = await bcrypt.hash(password, 10);
  const out = await withTransaction(async (c) => {
    const found = await c.query(`SELECT id FROM app_user WHERE lower(email) = lower($1)`, [email]);
    let id;
    let created = false;
    if (found.rowCount > 0) {
      id = found.rows[0].id;
      await c.query(
        `UPDATE app_user SET password_hash = $2, role = 'ADMIN', status = 'ACTIVE', updated_at = now() WHERE id = $1`,
        [id, hash]
      );
    } else {
      const u = await c.query(
        `INSERT INTO app_user (email, password_hash, role, status) VALUES (lower($1), $2, 'ADMIN', 'ACTIVE') RETURNING id`,
        [email, hash]
      );
      id = u.rows[0].id;
      created = true;
    }
    await c.query(
      `INSERT INTO user_profile (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [id, fullName]
    );
    return { id, created };
  });

  console.log('[create-admin] %s tai khoan admin %s (id %d)', out.created ? 'Da tao' : 'Da cap nhat', email, out.id);
}

main()
  .catch((err) => {
    console.error('[create-admin] that bai: %s', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
