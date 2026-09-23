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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in with Google - SanBong.vn</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 450px;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
      padding: 40px 32px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .google-logo {
      font-size: 32px;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 24px;
      color: #202124;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      color: #5f6368;
    }
    .dev-badge {
      display: inline-block;
      background: #fef7e0;
      color: #9c6c00;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 20px;
      border-left: 3px solid #f9ab00;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 14px;
      color: #202124;
      font-weight: 500;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 12px 12px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      font-size: 16px;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    input:focus {
      outline: none;
      border-color: #1f71b8;
      box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 2px 4px rgba(31,113,184,0.15);
    }
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    button {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .btn-cancel {
      background: white;
      color: #3c4043;
    }
    .btn-cancel:hover {
      background: #f8f9fa;
      border-color: #c6c6c6;
    }
    .btn-submit {
      background: #1f71b8;
      color: white;
      border-color: #1f71b8;
    }
    .btn-submit:hover {
      background: #1765a0;
      border-color: #1765a0;
      box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.12);
    }
    .btn-submit:active {
      background: #1458a5;
    }
    .info-box {
      background: #e8f0fe;
      border-left: 4px solid #4285f4;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #1f2937;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #dadce0;
      font-size: 12px;
      color: #5f6368;
    }
    .footer a {
      color: #1f71b8;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="google-logo">🔐</div>
        <h1>Sign in with Google</h1>
        <p>for SanBong.vn</p>
      </div>

      <div class="dev-badge">⚙️ Development Mode (Mock)</div>

      <div class="info-box">
        <strong>Testing Google OAuth</strong><br>
        Use any email address to test the registration and login flow.
      </div>

      <form method="get" action="/api/auth/google/callback" onsubmit="return validateForm()">
        <div class="form-group">
          <label for="email">Email or phone</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value="testuser@gmail.com"
            required
            autofocus
          >
        </div>

        <div class="form-group">
          <label for="name">Full name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Your name"
            value="Test User"
            required
          >
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="window.history.back()">Cancel</button>
          <button type="submit" class="btn-submit">Continue</button>
        </div>
      </form>

      <div class="footer">
        <p>
          <a href="javascript:void(0)" onclick="showHelp()">Need help?</a> ·
          <a href="javascript:void(0)" onclick="showPrivacy()">Privacy</a> ·
          <a href="javascript:void(0)" onclick="showTerms()">Terms</a>
        </p>
      </div>
    </div>
  </div>

  <script>
    function validateForm() {
      const email = document.getElementById('email').value.trim();
      const name = document.getElementById('name').value.trim();

      if (!email || !name) {
        alert('Please fill in all fields');
        return false;
      }

      if (!email.includes('@')) {
        alert('Please enter a valid email');
        return false;
      }

      return true;
    }

    function showHelp() {
      alert('This is a mock Google login for development testing.\\n\\n' +
            'Use any email and name to test the flow.\\n' +
            'No real Google account is needed.');
    }

    function showPrivacy() {
      alert('Privacy Policy: This mock login is for development only.');
    }

    function showTerms() {
      alert('Terms of Service: This mock login is for development testing.');
    }

    // Auto-focus email field
    document.getElementById('email').focus();
  </script>
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
