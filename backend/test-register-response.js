require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('./src/db');
const { signAccessToken } = require('./src/modules/auth/token');

const app = express();
app.use(express.json());

// Test registration endpoint response
app.post('/test-register', async (req, res) => {
  try {
    const { phone, password, full_name, district_code } = req.body;

    const phone_number = phone;
    const passwordHash = await bcrypt.hash(password, 10);

    // Simulate createUserWithProfile
    const user = await withTransaction(async (c) => {
      const u = await c.query(
        `INSERT INTO app_user (phone, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
        [phone_number, passwordHash, 'PLAYER']
      );
      const user = u.rows[0];

      const p = await c.query(
        `INSERT INTO user_profile (user_id, full_name, district_code)
         VALUES ($1, $2, $3) RETURNING user_id, full_name, avatar_url, district_code, skill_level, preferred_position, reputation_score, total_matches, bio, updated_at`,
        [user.id, full_name, district_code || null]
      );

      return { ...user, ...p.rows[0] };
    });

    // Remove password_hash
    const { password_hash, ...safeUser } = user;

    const response = {
      access_token: signAccessToken(user),
      refresh_token: 'mock-refresh-token',
      user: safeUser,
    };

    console.log('\n✅ REGISTRATION RESPONSE:');
    console.log(JSON.stringify(response, null, 2));

    res.json(response);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/test-register`);
  console.log('\nExample body:');
  console.log(JSON.stringify({
    phone: '0987654322',
    password: 'test123456',
    full_name: 'Test User 999',
    district_code: null
  }, null, 2));
});
