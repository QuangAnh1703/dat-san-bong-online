require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const r = await pool.query(`
      SELECT u.id, u.phone, u.role, u.created_at,
             p.full_name, p.district_code
      FROM app_user u
      LEFT JOIN user_profile p ON p.user_id = u.id
      WHERE u.id >= 114
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    console.log('📊 Recent users:\n');
    r.rows.forEach(row => {
      console.log(`User ${row.id}: ${row.phone} | ${row.full_name || '(no profile)'}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
