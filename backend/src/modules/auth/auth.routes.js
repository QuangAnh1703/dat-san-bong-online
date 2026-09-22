'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { AppError, requireFields } = require('../../lib/errors');
const { findByPhone, createUserWithProfile, touchLastLogin } = require('./user.repository');
const { signAccessToken, signRefreshToken } = require('./token');
const { storeOtp, verifyOtp } = require('./otp.service');

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

// POST /api/auth/request-otp  body: { phone }
// Request OTP for registration
router.post('/request-otp', async (req, res, next) => {
  try {
    const { phone } = req.body || {};
    requireFields(req.body, ['phone']);

    if (!PHONE_RE.test(phone)) throw new AppError('INVALID_PHONE');

    const existing = await findByPhone(phone);
    if (existing) throw new AppError('PHONE_TAKEN');

    const otp = await storeOtp(phone, 'REGISTER');
    res.json({ message: 'OTP sent', phone: phone.slice(-4) });
  } catch (err) {
    if (err.message.startsWith('OTP_LOCKED')) {
      const seconds = err.message.split('_')[2];
      next(new AppError('OTP_RATE_LIMITED', { details: { retry_after: seconds } }));
    } else {
      next(err);
    }
  }
});

// POST /api/auth/verify-otp  body: { phone, otp }
// Verify OTP - returns temp token valid for 10 minutes
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body || {};
    requireFields(req.body, ['phone', 'otp']);

    if (!PHONE_RE.test(phone)) throw new AppError('INVALID_PHONE');

    await verifyOtp(phone, otp, 'REGISTER');

    // Return temp token (valid for 10 minutes to register)
    const tempToken = Buffer.from(JSON.stringify({ phone, verified_at: Date.now() })).toString('base64');
    res.json({ temp_token: tempToken });
  } catch (err) {
    if (err.message === 'OTP_EXPIRED') {
      next(new AppError('OTP_EXPIRED'));
    } else if (err.message.startsWith('OTP_LOCKED')) {
      const seconds = err.message.split('_')[2];
      next(new AppError('OTP_RATE_LIMITED', { details: { retry_after: seconds } }));
    } else if (err.message.startsWith('OTP_INVALID')) {
      const left = err.message.split('_')[2];
      next(new AppError('OTP_INVALID', { message: `OTP khong dung. Con ${left}` }));
    } else {
      next(err);
    }
  }
});

// POST /api/auth/register-with-otp  body: { temp_token, password, full_name, district_code? }
// Register after OTP verification
router.post('/register-with-otp', async (req, res, next) => {
  try {
    const { temp_token, password, full_name, district_code } = req.body || {};
    requireFields(req.body, ['temp_token', 'password', 'full_name']);

    if (String(password).length < 6) throw new AppError('WEAK_PASSWORD');

    // Decode temp token
    let verified;
    try {
      const data = JSON.parse(Buffer.from(temp_token, 'base64').toString());
      if (Date.now() - data.verified_at > 10 * 60 * 1000) {
        throw new AppError('OTP_EXPIRED');
      }
      verified = data;
    } catch (e) {
      throw new AppError('INVALID_TEMP_TOKEN');
    }

    const { phone } = verified;
    const existing = await findByPhone(phone);
    if (existing) throw new AppError('PHONE_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithProfile({
      phone,
      passwordHash,
      fullName: full_name,
      districtCode: district_code,
    });

    res.status(201).json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) { next(err); }
});

module.exports = router;
