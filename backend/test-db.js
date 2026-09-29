require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    console.log('🔍 Checking user_profile constraints...');
    const r1 = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_profile'
    `);
    console.log('Constraints:', r1.rows);

    console.log('\n🔍 Checking user_profile columns...');
    const r2 = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_profile'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', r2.rows);

    console.log('\n🔍 Checking for foreign key on user_profile.user_id...');
    const r3 = await pool.query(`
      SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
      WHERE table_name = 'user_profile'
    `);
    console.log('Foreign Keys:', r3.rows);

    console.log('\n✅ Kết nối database thành công!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
