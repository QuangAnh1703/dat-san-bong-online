'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { AppError, requireFields } = require('../../lib/errors');
const { findByPhone, createUserWithProfile, touchLastLogin } = require('./user.repository');
const { signAccessToken, signRefreshToken } = require('./token');

const router = express.Router();

// SDT Viet Nam: dung 10 chu so, bat dau bang 0 - khop CHECK ck_user_phone_format
const PHONE_RE = /^0[0-9]{9}$/;

function toSafeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/register  body: { phone, password, full_name, district_code? }
router.post('/register', async (req, res, next) => {
  try {
    const { phone, password, full_name, district_code } = req.body || {};
    requireFields(req.body, ['phone', 'password', 'full_name']);

    if (!PHONE_RE.test(phone)) throw new AppError('INVALID_PHONE');
    if (String(password).length < 6) throw new AppError('WEAK_PASSWORD');

    const existing = await findByPhone(phone);
    if (existing) throw new AppError('PHONE_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithProfile({ phone, passwordHash, fullName: full_name, districtCode: district_code });

    res.status(201).json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) { next(err); }
});

// POST /api/auth/login  body: { phone, password }
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body || {};
    requireFields(req.body, ['phone', 'password']);

    const user = await findByPhone(phone);
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new AppError('INVALID_CREDENTIALS');

    await touchLastLogin(user.id);

    res.json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) { next(err); }
});

module.exports = router;
