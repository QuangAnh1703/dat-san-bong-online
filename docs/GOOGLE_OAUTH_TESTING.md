# Google OAuth Testing Guide (SCRUM-103-105)

## Prerequisites

### 1. Google Cloud Setup (SCRUM-103)
Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to:
- Create a Google Cloud Project
- Enable Google+ API
- Create OAuth 2.0 credentials
- Get Client ID and Client Secret

### 2. Environment Configuration

**Backend** (`.env`):
```
DATABASE_URL=postgresql://sanbong:sanbong123@localhost:5433/sanbong
PORT=3000
JWT_ACCESS_SECRET=dev-secret-123
JWT_REFRESH_SECRET=dev-refresh-123
CORS_ORIGIN=http://localhost:5173

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<YOUR_CLIENT_ID>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`.env.local` - optional, only if not using Vite proxy):
```
VITE_API_URL=http://localhost:3000
```

### 3. Start Services

```bash
# Terminal 1: Database
cd csdl
docker compose up -d

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

Verify:
- Backend: http://localhost:3000/health
- Frontend: http://localhost:5173
- Docs: http://localhost:3000/docs

## Test Cases

### TC-1: New User Registration via Google (SCRUM-104)

**Steps:**
1. Open http://localhost:5173 in browser
2. Click "Đăng ký" button
3. Click "Đăng ký với Google" button
4. Login with a Google account that doesn't exist in the system
5. Should be redirected back to home page

**Expected Results:**
- ✅ User is logged in successfully
- ✅ Access token and refresh token are stored in localStorage
- ✅ User name appears in header
- ✅ New user created in `app_user` table with email
- ✅ New `user_profile` created with name from Google
- ✅ New `oauth_account` created with provider='GOOGLE' and provider_uid from Google

**Verification:**
```sql
-- Check app_user
SELECT id, email, phone, role, status FROM app_user 
WHERE email = 'test@gmail.com' LIMIT 1;

-- Check user_profile  
SELECT user_id, full_name, district_code FROM user_profile
WHERE user_id = <id_from_above>;

-- Check oauth_account
SELECT user_id, provider, provider_uid FROM oauth_account
WHERE user_id = <id_from_above> AND provider = 'GOOGLE';
```

### TC-2: Login via Google with Existing Email (SCRUM-105)

**Setup:**
1. Register user A with email `test@gmail.com` using OTP flow
2. Logout

**Steps:**
1. Click "Đăng nhập"
2. Click "Đăng nhập với Google"
3. Login with same Google account (test@gmail.com)
4. Should be redirected back to home page

**Expected Results:**
- ✅ User is logged in successfully (User A)
- ✅ NO new user created (still only 1 user with test@gmail.com)
- ✅ `oauth_account` is linked to existing User A
- ✅ No error about "Email already taken"

**Verification:**
```sql
-- Should still be 1 user with this email
SELECT COUNT(*) FROM app_user WHERE email = 'test@gmail.com';

-- oauth_account should be linked
SELECT * FROM oauth_account 
WHERE provider_uid = '<google_uid_for_this_account>' 
AND provider = 'GOOGLE';
```

### TC-3: Multiple OAuth Providers for Same User (Future - SCRUM-106)

**Setup:**
1. Register with email via OTP
2. Link Google account
3. (Future) Link Facebook account

**Expected:**
- Same user can have multiple oauth_accounts

### TC-4: Error Handling

**TC-4a: Missing Google OAuth Configuration**
```bash
# In backend .env, remove GOOGLE_OAUTH_CLIENT_ID
```
- Expected: Warning in console, button still appears but redirects gracefully

**TC-4b: Invalid OAuth Callback**
- Direct access to `/api/auth/google/callback` without code
- Expected: Error handled, redirect to frontend error page

**TC-4c: Browser Popup Blocked**
- Block popups in browser settings
- Expected: Redirect works (not popup-based)

## Integration Tests

### Check Database Schema
```sql
-- Verify oauth_account table exists
\d oauth_account

-- Should show columns: id, user_id, provider, provider_uid, linked_at
```

### API Endpoint Tests

**Test 1: Initiate Google Login**
```bash
curl -i http://localhost:3000/api/auth/google
# Expected: 302 redirect to Google OAuth endpoint
```

**Test 2: Callback Handler**
```bash
# This requires a valid Google auth code
# Best tested through browser flow
```

## Bug Fixes & Known Issues

### Issue 1: Redirect URI Mismatch
- **Error**: `redirect_uri_mismatch` from Google
- **Fix**: Verify `.env` GOOGLE_OAUTH_REDIRECT_URI matches Google Console setting

### Issue 2: Session Handling
- **Current**: Server-less approach (tokens in URL)
- **Note**: Tokens should be stored in localStorage by frontend

### Issue 3: User Profile Creation
- **Current**: Only `full_name` from Google
- **Note**: `district_code` and `skill_level` use defaults

## Performance Checklist

- [ ] Google OAuth callback completes within 2 seconds
- [ ] No N+1 queries when linking OAuth
- [ ] No SQL errors in backend logs
- [ ] Frontend doesn't store sensitive tokens in URL longer than necessary

## Security Checklist

- [ ] Client secret never exposed in frontend code
- [ ] Tokens validated before use
- [ ] HTTPS enforced in production
- [ ] CSRF tokens implemented (if using sessions)
- [ ] Rate limiting on /api/auth/google/callback
- [ ] Email verified from Google before user creation

## Documentation Updates

After testing is complete:
- [ ] Update API docs (openapi.yaml) with Google OAuth endpoints
- [ ] Add error response examples
- [ ] Document SCRUM-105 email linking behavior
- [ ] Add troubleshooting section

## Rollback Plan

If Google OAuth breaks production:

1. Set `GOOGLE_OAUTH_CLIENT_ID=` (empty) in production env
2. Google login buttons will still appear but show message
3. Users can still use email/OTP login

## Next Steps (SCRUM-106+)

- [ ] Facebook OAuth integration
- [ ] Account linking UI in profile page  
- [ ] Disconnect OAuth provider option
- [ ] Phone-based OAuth (if needed)
- [ ] WebAuthn/passkey support
