const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'sanbong',
  password: '0111',
  database: 'sanbong'
});

async function test() {
  try {
    console.log('🔗 Connecting to PostgreSQL...');
    const r = await pool.query('SELECT version()');
    console.log('✅ Connected!', r.rows[0].version.substring(0, 40));

    console.log('\n📊 Latest users:\n');
    const users = await pool.query(`
      SELECT
        u.id, u.phone, u.email, u.role, u.created_at,
        p.full_name
      FROM app_user u
      LEFT JOIN user_profile p ON p.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    if (users.rows.length === 0) {
      console.log('❌ No users found');
    } else {
      users.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID ${row.id}: ${row.phone || row.email} | ${row.full_name || '(no profile)'}`);
      });
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
