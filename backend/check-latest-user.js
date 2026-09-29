require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    console.log('📊 Checking latest users...\n');

    const r = await pool.query(`
      SELECT
        u.id, u.phone, u.email, u.role, u.created_at,
        p.full_name, p.district_code
      FROM app_user u
      LEFT JOIN user_profile p ON p.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    if (r.rows.length === 0) {
      console.log('❌ No users found');
    } else {
      r.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID ${row.id}: ${row.phone || row.email} | ${row.full_name || '(no profile)'} | ${row.role}`);
        console.log(`   Created: ${row.created_at}`);
        console.log();
      });
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
  }
}

test();
