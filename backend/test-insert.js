require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const client = await pool.connect();
  try {
    console.log('🧪 Testing INSERT with transaction...\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('✅ Transaction started');

    // 1. Insert app_user
    const phoneTest = '0' + Math.random().toString().slice(2, 11);
    const passwordHash = await bcrypt.hash('test123', 10);

    console.log(`\n📝 Inserting app_user with phone: ${phoneTest}`);
    const u = await client.query(
      `INSERT INTO app_user (phone, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
      [phoneTest, passwordHash, 'PLAYER']
    );
    const user = u.rows[0];
    console.log('✅ app_user inserted:', { id: user.id, phone: user.phone });

    // 2. Insert user_profile
    console.log(`\n📝 Inserting user_profile for user_id: ${user.id}`);
    try {
      const p = await client.query(
        `INSERT INTO user_profile (user_id, full_name, district_code)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.id, 'Test User', null]
      );
      console.log('✅ user_profile inserted:', p.rows[0]);
    } catch (err) {
      console.error('❌ user_profile INSERT failed:', err.message);
      throw err;
    }

    // Commit
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Transaction rolled back:', err.message);
    console.error('Full error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
