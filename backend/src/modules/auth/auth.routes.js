'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { AppError, requireFields } = require('../../lib/errors');
const jwt = require('jsonwebtoken');
const {
  findByPhone,
  findByEmail,
  findById,
  createUserWithEmail,
  createUserWithProfile,
  touchLastLogin,
} = require('./user.repository');
const { signAccessToken, signRefreshToken } = require('./token');
const { storeOtp, verifyOtp } = require('./otp.service');
const { initGoogleOAuth } = require('./google-oauth.service');
const { query } = require('../../db');

const router = express.Router();

// Initialize Google OAuth
initGoogleOAuth();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Dang nhap chap nhan moi SDT 10 so (tai khoan cu); dang ky chi nhan dau so di dong VN
const PHONE_RE = /^0[0-9]{9}$/;
const MOBILE_RE = /^0[35789][0-9]{8}$/;
const VALID_ROLES = ['PLAYER', 'OWNER'];
const TEMP_TOKEN_TTL = '10m';

function assertStrongPassword(password) {
  const p = String(password);
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new AppError('WEAK_PASSWORD');
}

function assertRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError('INVALID_FIELD', {
      details: { field: 'role', reason: `Must be one of: ${VALID_ROLES.join(', ')}` },
    });
  }
}

// temp_token phai co chu ky: neu chi la base64 thi ai cung tu tao duoc token cho email bat ky
function signTempToken(email, purpose) {
  return jwt.sign({ email, purpose }, process.env.JWT_ACCESS_SECRET, { expiresIn: TEMP_TOKEN_TTL });
}

function verifyTempToken(token, purpose) {
  let data;
  try {
    data = jwt.verify(String(token), process.env.JWT_ACCESS_SECRET);
  } catch (e) {
    throw new AppError(e.name === 'TokenExpiredError' ? 'OTP_EXPIRED' : 'INVALID_TEMP_TOKEN');
  }
  if (data.purpose !== purpose || !data.email) throw new AppError('INVALID_TEMP_TOKEN');
  return data.email;
}

function mapOtpError(err) {
  if (err.message === 'OTP_EXPIRED') return new AppError('OTP_EXPIRED');
  if (err.message === 'EMAIL_SEND_FAILED') return new AppError('EMAIL_SEND_FAILED');
  if (err.message.startsWith('OTP_LOCKED')) {
    return new AppError('OTP_RATE_LIMITED', { details: { retry_after: parseInt(err.message.split('_')[2], 10) } });
  }
  if (err.message.startsWith('OTP_INVALID')) {
    const left = parseInt(err.message.split('_')[2], 10);
    return new AppError('OTP_INVALID', {
      message: `Mã OTP không đúng. Còn ${left} lần thử`,
      details: { attempts_left: left },
    });
  }
  return err;
}

function toSafeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/login  body: { email OR phone_number, password }
// Hỗ trợ đăng nhập bằng email hoặc số điện thoại
router.post('/login', async (req, res, next) => {
  try {
    const { email, phone_number, password } = req.body || {};
    requireFields(req.body, ['password']);

    if (!email && !phone_number) {
      throw new AppError('INVALID_FIELD', {
        details: { field: 'email/phone_number', reason: 'Email hoặc số điện thoại là bắt buộc' },
      });
    }

    let user = null;

    // Đăng nhập bằng email
    if (email) {
      if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');
      user = await findByEmail(email);
    }
    // Đăng nhập bằng phone
    else if (phone_number) {
      if (!PHONE_RE.test(phone_number)) throw new AppError('INVALID_PHONE');
      user = await findByPhone(phone_number);
    }

    // Tai khoan tao qua Google khong co mat khau: bcrypt.compare voi hash null se nem loi 500
    const ok = user && user.password_hash && (await bcrypt.compare(String(password), user.password_hash));
    if (!ok) throw new AppError('INVALID_CREDENTIALS');
    if (user.status === 'LOCKED') throw new AppError('ACCOUNT_LOCKED');

    await touchLastLogin(user.id);

    res.json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh  body: { refresh_token }
// Access token chi song 15 phut -> client doi refresh token (7 ngay) lay access token moi
router.post('/refresh', async (req, res, next) => {
  try {
    requireFields(req.body, ['refresh_token']);
    let payload;
    try {
      payload = jwt.verify(req.body.refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      throw new AppError(e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
    }
    if (payload.type !== 'refresh') throw new AppError('INVALID_TOKEN');

    const user = await findById(payload.sub);
    if (!user) throw new AppError('INVALID_TOKEN');
    if (user.status === 'LOCKED') throw new AppError('ACCOUNT_LOCKED');

    res.json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/request-otp  body: { email }
// Request OTP for EMAIL registration only (phone registration doesn't use OTP)
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
    next(mapOtpError(err));
  }
});

// POST /api/auth/verify-otp  body: { email, otp }
// Verify OTP for EMAIL registration only - returns temp token valid for 10 minutes
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    requireFields(req.body, ['email', 'otp']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    await verifyOtp(email, String(otp), 'REGISTER');
    res.json({ temp_token: signTempToken(email.toLowerCase(), 'register') });
  } catch (err) {
    next(mapOtpError(err));
  }
});

// POST /api/auth/register-with-otp  body: { temp_token, password, full_name, district_code?, role? }
// Register after OTP verification (EMAIL only - phone uses /register-with-phone)
// role: 'PLAYER' (default) or 'OWNER'
router.post('/register-with-otp', async (req, res, next) => {
  try {
    const { temp_token, password, full_name, district_code, role = 'PLAYER' } = req.body || {};
    requireFields(req.body, ['temp_token', 'password', 'full_name']);

    assertStrongPassword(password);
    assertRole(role);
    const email = verifyTempToken(temp_token, 'register');

    const existing = await findByEmail(email);
    if (existing) throw new AppError('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithEmail({
      email,
      passwordHash,
      fullName: full_name,
      districtCode: district_code,
      role,
    });

    res.status(201).json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register-with-phone  body: { phone_number, password, full_name, district_code?, role? }
// Register with PHONE - no OTP required
// role: 'PLAYER' (default) or 'OWNER'
router.post('/register-with-phone', async (req, res, next) => {
  try {
    const { phone_number, password, full_name, district_code, role = 'PLAYER' } = req.body || {};
    requireFields(req.body, ['phone_number', 'password', 'full_name']);

    if (!MOBILE_RE.test(phone_number)) throw new AppError('INVALID_PHONE');
    assertStrongPassword(password);
    assertRole(role);

    const existing = await findByPhone(phone_number);
    if (existing) throw new AppError('PHONE_TAKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithProfile({
      phone: phone_number,
      passwordHash,
      fullName: full_name,
      districtCode: district_code,
      role,
    });

    res.status(201).json({
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user),
      user: toSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
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
      background: #f5f5f5;
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
      box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1);
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

      <form method="get" action="/api/auth/google/callback" onsubmit="return validateForm()">
        <div class="form-group">
          <label for="email">Email or phone</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
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
// Luon redirect ve frontend: thanh cong kem token, that bai kem ?error=<ma loi>
function redirectToFrontend(res, params) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/auth/google-callback?${new URLSearchParams(params).toString()}`);
}

async function finishGoogleLogin(res, user) {
  // Tai khoan bi admin khoa khong duoc vao lai bang Google
  if (user.status === 'LOCKED') return redirectToFrontend(res, { error: 'ACCOUNT_LOCKED' });
  await touchLastLogin(user.id);
  redirectToFrontend(res, {
    access_token: signAccessToken(user),
    refresh_token: signRefreshToken(user),
  });
}

router.get('/google/callback', async (req, res, next) => {
  try {
    const { handleGoogleCallbackMock } = require('./google-oauth.service');
    const isDev = process.env.NODE_ENV !== 'production';
    const clientID = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const hasRealConfig = clientID && clientSecret && !clientID.includes('mock');

    if (!hasRealConfig && isDev && (req.query.email || req.query.name)) {
      const { user } = await handleGoogleCallbackMock(req, res);
      return finishGoogleLogin(res, user);
    }
    if (!hasRealConfig) return next(new AppError('GOOGLE_OAUTH_NOT_CONFIGURED'));

    passport.authenticate('google', { session: false }, async (err, user) => {
      try {
        if (err || !user) return redirectToFrontend(res, { error: 'GOOGLE_LOGIN_FAILED' });
        await finishGoogleLogin(res, user);
      } catch (e) {
        next(e);
      }
    })(req, res, next);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google/logout
router.post('/google/logout', (req, res) => {
  // Invalidate token on client side; server-side sessions handled by client
  res.json({ message: 'Logged out' });
});

// ===== PASSWORD RESET =====

// POST /api/auth/forgot-password  body: { email }
// Request OTP để reset mật khẩu
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    requireFields(req.body, ['email']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    const user = await findByEmail(email);
    if (!user) {
      // Không báo lỗi để tránh leak email existence
      return res.json({ message: 'OTP sent to email if account exists' });
    }

    await storeOtp(email, 'RESET_PASSWORD');
    res.json({ message: 'OTP sent to email', email: email.replace(/.{1,}@/, '*@') });
  } catch (err) {
    next(mapOtpError(err));
  }
});

// POST /api/auth/verify-reset-otp  body: { email, otp }
// Verify OTP để reset mật khẩu
router.post('/verify-reset-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    requireFields(req.body, ['email', 'otp']);

    if (!EMAIL_RE.test(email)) throw new AppError('INVALID_EMAIL');

    await verifyOtp(email, String(otp), 'RESET_PASSWORD');
    res.json({ temp_token: signTempToken(email.toLowerCase(), 'reset_password') });
  } catch (err) {
    next(mapOtpError(err));
  }
});

// POST /api/auth/reset-password  body: { temp_token, password }
// Reset mật khẩu với temp token từ OTP verification
router.post('/reset-password', async (req, res, next) => {
  try {
    const { temp_token, password } = req.body || {};
    requireFields(req.body, ['temp_token', 'password']);

    assertStrongPassword(password);
    const email = verifyTempToken(temp_token, 'reset_password');
    const user = await findByEmail(email);
    if (!user) throw new AppError('USER_NOT_FOUND');

    const passwordHash = await bcrypt.hash(password, 10);
    await query(`UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      passwordHash,
      user.id,
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
