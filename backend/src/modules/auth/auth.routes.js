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

// GET /api/auth/google - Redirect to Google OAuth (or mock login)
router.get('/google', (req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const hasRealConfig = clientID && clientSecret && !clientID.includes('mock');

  // Dev mode without real credentials: show mock login dialog
  if (!hasRealConfig && isDev) {
    return res.type('html').send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mock Google Login</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
    h1 { margin: 0 0 24px; font-size: 20px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; }
    input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    button { width: 100%; padding: 10px; background: #4285f4; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; }
    button:hover { background: #3367d6; }
    .info { background: #e8f0fe; padding: 12px; border-radius: 4px; margin-bottom: 24px; font-size: 12px; color: #1f2937; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔐 Mock Google Login</h1>
    <div class="info">
      Development mode - use any email to test
    </div>
    <form method="get" action="/api/auth/google/callback">
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" value="testuser@gmail.com" required>
      </div>
      <div class="form-group">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" value="Test User" required>
      </div>
      <button type="submit">🔗 Login with Mock Google</button>
    </form>
  </div>
</body>
</html>
    `);
  }

  if (!hasRealConfig && !isDev) {
    return next(new AppError('GOOGLE_OAUTH_NOT_CONFIGURED'));
  }

  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const { handleGoogleCallbackMock } = require('./google-oauth.service');
    const isDev = process.env.NODE_ENV !== 'production';
    const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const hasRealConfig = clientID && clientSecret && !clientID.includes('mock');

    let user;

    // Mock mode
    if (!hasRealConfig && isDev && (req.query.email || req.query.name)) {
      const result = await handleGoogleCallbackMock(req, res);
      user = result.user;
    } else if (hasRealConfig) {
      // Real Google OAuth
      return passport.authenticate('google', { session: false }, async (err, authenticatedUser) => {
        if (err || !authenticatedUser) {
          return next(new AppError('GOOGLE_LOGIN_FAILED', { cause: err }));
        }
        user = authenticatedUser;
        await touchLastLogin(user.id);
        const safeUser = toSafeUser(user);
        const tokens = {
          access_token: signAccessToken(user),
          refresh_token: signRefreshToken(user),
          user: safeUser,
        };
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const params = new URLSearchParams();
        params.set('access_token', tokens.access_token);
        params.set('refresh_token', tokens.refresh_token);
        params.set('user', JSON.stringify(tokens.user));
        res.redirect(`${frontendUrl}/auth/google-callback?${params.toString()}`);
      })(req, res, next);
    } else {
      return next(new AppError('GOOGLE_OAUTH_NOT_CONFIGURED'));
    }

    // Handle mock flow response
    await touchLastLogin(user.id);
    const safeUser = toSafeUser(user);
    const tokens = {
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: safeUser,
    };
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
