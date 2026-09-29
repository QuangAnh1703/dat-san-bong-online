require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    // Try login with user 114 (password từ lúc register)
    const testPassword = 'test123'; // Mật khẩu bạn đã dùng lúc register

    const r = await pool.query(`
      SELECT u.*, p.full_name, p.district_code, p.skill_level
      FROM app_user u
      LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE u.phone = '0912888887'
    `);

    if (r.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = r.rows[0];
    console.log('✅ User found:', { id: user.id, phone: user.phone, name: user.full_name });

    // Verify password
    // Note: Bạn cần nhập mật khẩu thực tế đã dùng lúc register
    console.log('\nℹ️ Password hash stored:', user.password_hash.substring(0, 20) + '...');
    console.log('ℹ️ Để test login, cần biết mật khẩu bạn đã dùng lúc register');

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
