# Role-Based Access Control (RBAC) - SCRUM-106-108

## Overview

This document describes the role-based access control (RBAC) system for SanBong.vn, implemented with Express middleware.

**Roles:**
- `PLAYER` (default) - Regular users who book fields
- `OWNER` - Venue owners who manage their fields
- `ADMIN` - System administrators with full access

## SCRUM-106: Spring Security Configuration (RBAC by Role)

### Role Hierarchy

```
┌─────────────────────────────────────┐
│           ADMIN                     │
│  - Full system access               │
│  - Manage users & venues            │
│  - View analytics                   │
└──────────────┬──────────────────────┘
               │
┌──────────────v──────────────────────┐
│           OWNER                     │
│  - Create/manage own venues         │
│  - View own bookings                │
│  - Cannot approve venues (admin)    │
└──────────────┬──────────────────────┘
               │
┌──────────────v──────────────────────┐
│           PLAYER                    │
│  - View venues                      │
│  - Create bookings                  │
│  - Find teams (community)           │
└─────────────────────────────────────┘
```

### Implementation

**Files:**
- `backend/src/middlewares/auth.js` - JWT token verification
- `backend/src/middlewares/rbac.js` - Role-based access control
- `backend/src/server.js` - Middleware initialization

**Middleware Chain:**
```
Request
  ↓
requestId (generate unique ID)
  ↓
requestLogger (log request)
  ↓
verifyAccessToken (parse JWT, attach req.user)
  ↓
checkPermission (verify role for route)
  ↓
Route Handler
  ↓
Response
```

## SCRUM-107: Endpoint Permissions by Role

### Permission Matrix

| Endpoint | PLAYER | OWNER | ADMIN |
|----------|--------|-------|-------|
| **Venues** |
| GET /api/venues | ✅ | ✅ | ✅ |
| GET /api/venues/:id | ✅ | ✅ | ✅ |
| POST /api/venues | ❌ | ✅ | ✅ |
| PUT /api/venues/:id | ❌ | ✅ | ✅ |
| DELETE /api/venues/:id | ❌ | ✅ | ✅ |
| **Bookings** |
| POST /api/bookings | ✅ | ✅ | ✅ |
| GET /api/bookings | ✅ | ✅ | ✅ |
| GET /api/bookings/:code | ✅ | ✅ | ✅ |
| PUT /api/bookings/:code | ❌ | ✅ | ✅ |
| DELETE /api/bookings/:code | ✅ | ✅ | ✅ |
| **Community** |
| POST /api/community/posts | ✅ | ✅ | ✅ |
| GET /api/community/posts | ✅ | ✅ | ✅ |
| POST /api/community/posts/:id/match | ✅ | ✅ | ✅ |
| **Admin Only** |
| GET /api/admin/users | ❌ | ❌ | ✅ |
| PUT /api/admin/users/:id/role | ❌ | ❌ | ✅ |
| POST /api/admin/venues/:id/approve | ❌ | ❌ | ✅ |
| POST /api/admin/venues/:id/reject | ❌ | ❌ | ✅ |
| GET /api/admin/analytics | ❌ | ❌ | ✅ |

### Endpoints by Group

#### Venues (SCRUM-107)
- **PLAYER**: Can view all venues
- **OWNER**: Can create, read, update, delete own venues
- **ADMIN**: Can manage all venues (approve/reject)

#### Bookings
- **PLAYER**: Can create bookings, view own
- **OWNER**: Can view bookings for own venues, approve/confirm
- **ADMIN**: Can view all bookings, manage disputes

#### Community (Matchmaking)
- **PLAYER**: Can post team-find-player, find teams
- **OWNER**: Same as player
- **ADMIN**: Moderate content

#### Admin Panel
- **ADMIN ONLY**: User management, analytics, venue approval

## SCRUM-108: Test Player Cannot Access Owner/Admin

### Test Cases

#### TC-1: Player Cannot Create Venue
```bash
POST /api/venues
Authorization: Bearer <player-token>
```
**Expected:** `403 Forbidden`

#### TC-2: Player Cannot Update Venue
```bash
PUT /api/venues/123
Authorization: Bearer <player-token>
```
**Expected:** `403 Forbidden`

#### TC-3: Player Cannot Access Admin Users
```bash
GET /api/admin/users
Authorization: Bearer <player-token>
```
**Expected:** `403 Forbidden`

#### TC-4: Player Cannot Approve Venues
```bash
POST /api/admin/venues/123/approve
Authorization: Bearer <player-token>
```
**Expected:** `403 Forbidden`

#### TC-5: Owner Cannot Approve Venues
```bash
POST /api/admin/venues/123/approve
Authorization: Bearer <owner-token>
```
**Expected:** `403 Forbidden`
(Only ADMIN can approve)

### Response Format

When access is denied:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied for role: PLAYER",
    "requestId": "abc123...",
    "timestamp": "2026-09-23T10:30:00Z"
  }
}
```

## Usage Examples

### Creating Protected Routes

**Option 1: Using requireRole**
```javascript
const { requireRole } = require('./middlewares/rbac');

router.post('/venues', requireRole('OWNER', 'ADMIN'), (req, res) => {
  // Handler
});
```

**Option 2: Using permissions configuration**
```javascript
// Automatically checked by checkPermission() middleware
// Just define in permissions object in rbac.js
permissions['POST /api/venues'] = ['OWNER', 'ADMIN'];
```

### Getting User Role

```javascript
// After verifyAccessToken middleware
app.get('/profile', (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  
  res.json({ userId, userRole });
});
```

## Database Schema

Users have a `role` field in `app_user` table:

```sql
CREATE TABLE app_user (
  id    BIGINT PRIMARY KEY,
  email VARCHAR(150),
  role  user_role NOT NULL DEFAULT 'PLAYER',
  ...
);

CREATE TYPE user_role AS ENUM ('PLAYER', 'OWNER', 'ADMIN');
```

## Changing User Role

```javascript
// Only ADMIN can change roles
app.put('/api/admin/users/:id/role', requireRole('ADMIN'), async (req, res) => {
  const { role } = req.body; // 'PLAYER' | 'OWNER' | 'ADMIN'
  
  const result = await query(
    'UPDATE app_user SET role = $1, updated_at = now() WHERE id = $2',
    [role, req.params.id]
  );
  
  res.json({ message: 'Role updated', role });
});
```

## Security Considerations

1. **Token Validation**: Always verify JWT before checking role
2. **Role Hierarchy**: Don't allow users to assign themselves higher roles
3. **Audit Logging**: Log all admin actions (role changes, approvals, etc.)
4. **Data Isolation**: Players should only see their own bookings (implement in queries)
5. **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days

## Future Enhancements

- [ ] Fine-grained permissions (e.g., "can_approve_venues")
- [ ] Permission groups/roles (e.g., "MODERATOR")
- [ ] Row-level security (e.g., owner can only see own venues)
- [ ] Audit trail for all admin actions
- [ ] Rate limiting by role (admins get higher limits)
- [ ] IP whitelist for admin endpoints

## Testing

Run tests:
```bash
npm test -- rbac.test.js
```

Test results verify:
- ✅ SCRUM-106: Roles configured correctly
- ✅ SCRUM-107: Endpoints have correct permissions
- ✅ SCRUM-108: Players cannot access owner/admin endpoints
