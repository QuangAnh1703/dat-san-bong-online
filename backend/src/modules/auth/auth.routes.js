'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { AppError, requireFields } = require('../../lib/errors');
const { findByEmail, createUserWithEmail, touchLastLogin } = require('./user.repository');
const { signAccessToken, signRefreshToken } = require('./token');
const { storeOtp, verifyOtp } = require('./otp.service');
const { initGoogleOAuth } = require('./google-oauth.service');

const router = express.Router();

// Initialize Google OAuth
initGoogleOAuth();

// Email validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toSafeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/login  body: { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    requireFields(req.body, ['email', 'password']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    const user = await findByEmail(email);
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

// POST /api/auth/request-otp  body: { email }
// Request OTP for registration, OTP sent via email
router.post('/request-otp', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    requireFields(req.body, ['email']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    const existing = await findByEmail(email);
    if (existing) throw new AppError('EMAIL_TAKEN');

    await storeOtp(email, 'REGISTER');
    res.json({ message: 'OTP sent to email', email: email.replace(/.{1,}@/, '*@') });
  } catch (err) {
    if (err.message.startsWith('OTP_LOCKED')) {
      const seconds = err.message.split('_')[2];
      next(new AppError('OTP_RATE_LIMITED', { details: { retry_after: seconds } }));
    } else {
      next(err);
    }
  }
});

// POST /api/auth/verify-otp  body: { email, otp }
// Verify OTP - returns temp token valid for 10 minutes
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    requireFields(req.body, ['email', 'otp']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    await verifyOtp(email, otp, 'REGISTER');

    // Return temp token (valid for 10 minutes to register)
    const tempToken = Buffer.from(JSON.stringify({ email, verified_at: Date.now() })).toString('base64');
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

    const { email } = verified;
    const existing = await findByEmail(email);
    if (existing) throw new AppError('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithEmail({
      email,
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

// GET /api/auth/google - Redirect to Google OAuth
// Frontend should redirect to this endpoint to start Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { session: false }), async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new AppError('GOOGLE_LOGIN_FAILED');

    await touchLastLogin(user.id);

    // Generate tokens
    const safeUser = toSafeUser(user);
    const tokens = {
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: safeUser,
    };

    // Redirect to frontend with tokens in URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams();
    params.set('access_token', tokens.access_token);
    params.set('refresh_token', tokens.refresh_token);
    params.set('user', JSON.stringify(tokens.user));

    res.redirect(`${frontendUrl}/auth/google-callback?${params.toString()}`);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google/logout
router.post('/google/logout', (req, res) => {
  // Invalidate token on client side; server-side sessions handled by client
  res.json({ message: 'Logged out' });
});

module.exports = router;
