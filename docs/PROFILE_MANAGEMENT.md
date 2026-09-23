# User Profile Management (SCRUM-109-111)

## Overview

This document describes the user profile management API, including profile viewing/updating, image upload to Cloudinary, and field validation.

## SCRUM-109: Profile API

### Get Current User Profile

**Endpoint:** `GET /api/profile`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "id": 1,
  "email": "player@example.com",
  "phone": null,
  "role": "PLAYER",
  "status": "ACTIVE",
  "phoneVerified": false,
  "fullName": "John Player",
  "avatarUrl": "https://res.cloudinary.com/user/avatar.jpg",
  "districtCode": "Q1",
  "skillLevel": "INTERMEDIATE",
  "preferredPosition": "FW",
  "reputationScore": 85,
  "totalMatches": 10,
  "bio": "Love football!",
  "createdAt": "2026-09-20T10:00:00Z",
  "updatedAt": "2026-09-23T15:30:00Z"
}
```

### Update User Profile

**Endpoint:** `PUT /api/profile`

**Authentication:** Required

**Request Body:**
```json
{
  "full_name": "John Updated",
  "bio": "Football enthusiast",
  "skill_level": "GOOD",
  "preferred_position": "MF",
  "avatar_url": "https://res.cloudinary.com/user/new-avatar.jpg",
  "district_code": "Q2"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "fullName": "John Updated",
    "avatarUrl": "https://res.cloudinary.com/user/new-avatar.jpg",
    "districtCode": "Q2",
    "skillLevel": "GOOD",
    "preferredPosition": "MF",
    "reputationScore": 85,
    "totalMatches": 10,
    "bio": "Football enthusiast",
    "updatedAt": "2026-09-23T16:00:00Z"
  }
}
```

### Get Public Profile

**Endpoint:** `GET /api/profile/:userId`

**Authentication:** Not required

**Response:** (Limited to public information)
```json
{
  "id": 2,
  "role": "PLAYER",
  "fullName": "Jane Owner",
  "avatarUrl": "https://res.cloudinary.com/user/jane.jpg",
  "districtCode": "Q2",
  "skillLevel": "SEMI_PRO",
  "preferredPosition": "ANY",
  "reputationScore": 95,
  "totalMatches": 50,
  "bio": "Professional player"
}
```

## SCRUM-110: Image Upload to Cloudinary

### Upload Avatar

**Endpoint:** `POST /api/profile/avatar`

**Authentication:** Required

**Request Body:**
```json
{
  "image_url": "https://res.cloudinary.com/user/image/upload/v123/avatar.jpg"
}
```

**Size Limit:** 5MB maximum

**Supported Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

**Response:**
```json
{
  "message": "Avatar updated",
  "avatar_url": "https://res.cloudinary.com/user/image/upload/v123/avatar.jpg",
  "updated_at": "2026-09-23T16:05:00Z"
}
```

### Configuration

**Environment Variables:**
```bash
# .env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Image Upload Process

1. User selects image file
2. Frontend validates (size < 5MB, valid format)
3. Upload to Cloudinary
4. Get secure URL
5. POST to `/api/profile/avatar`
6. Save URL to database

### Error Handling

**File Too Large:**
```json
{
  "error": {
    "code": "INVALID_FIELD",
    "message": "Image size exceeds 5MB limit (6MB)",
    "details": { "field": "image_url", "reason": "Size exceeds 5MB" }
  }
}
```

**Invalid Format:**
```json
{
  "error": {
    "code": "INVALID_FIELD",
    "message": "Invalid image type. Allowed: image/jpeg, image/png, image/webp, image/gif"
  }
}
```

## SCRUM-111: Field Validation

### Validation Rules

| Field | Type | Constraints | Example |
|-------|------|-------------|---------|
| `full_name` | String | Max 120 chars, non-empty | "John Doe" |
| `bio` | String | Max 500 chars, optional | "Love football!" |
| `avatar_url` | String | Max 500 chars, URL format | "https://res.cloudinary.com/..." |
| `skill_level` | Enum | BEGINNER / INTERMEDIATE / GOOD / SEMI_PRO | "INTERMEDIATE" |
| `preferred_position` | Enum | GK / DF / MF / FW / ANY | "FW" |
| `district_code` | String | Must exist in district table, optional | "Q1" |

### Skill Levels

| Level | Description |
|-------|-------------|
| `BEGINNER` | Just starting football |
| `INTERMEDIATE` | Regular player, ~2-3 years experience |
| `GOOD` | Experienced player, ~5+ years |
| `SEMI_PRO` | Professional or semi-professional |

### Positions

| Code | Position | Description |
|------|----------|-------------|
| `GK` | Goalkeeper | Thủ môn |
| `DF` | Defender | Hậu vệ |
| `MF` | Midfielder | Tiền vệ |
| `FW` | Forward | Tiền đạo |
| `ANY` | Any | Đá ở bất kỳ vị trí |

### Validation Examples

**Valid Update:**
```json
{
  "full_name": "Nguyễn Văn A",
  "bio": "Yêu thích bóng đá",
  "skill_level": "INTERMEDIATE",
  "preferred_position": "MF",
  "district_code": "Q1"
}
```

**Invalid - Name Too Long:**
```json
{
  "full_name": "A".repeat(121)  // Error: Max 120 characters
}
```

**Invalid - Bio Too Long:**
```json
{
  "bio": "A".repeat(501)  // Error: Max 500 characters
}
```

**Invalid - Invalid Skill Level:**
```json
{
  "skill_level": "EXPERT"  // Error: Must be BEGINNER, INTERMEDIATE, GOOD, or SEMI_PRO
}
```

**Invalid - Invalid Position:**
```json
{
  "preferred_position": "STRIKER"  // Error: Must be GK, DF, MF, FW, or ANY
}
```

### Error Responses

**Validation Error:**
```json
{
  "error": {
    "code": "INVALID_FIELD",
    "message": "Validation failed",
    "details": {
      "field": "skill_level",
      "reason": "Must be one of: BEGINNER, INTERMEDIATE, GOOD, SEMI_PRO"
    }
  }
}
```

## Database Schema

```sql
CREATE TABLE user_profile (
    user_id            BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    full_name          VARCHAR(120) NOT NULL,
    avatar_url         VARCHAR(500),
    district_code      VARCHAR(10) REFERENCES district(code),
    skill_level        skill_level NOT NULL DEFAULT 'BEGINNER',
    preferred_position position_type NOT NULL DEFAULT 'ANY',
    reputation_score   SMALLINT NOT NULL DEFAULT 100,
    total_matches      INTEGER NOT NULL DEFAULT 0,
    bio                VARCHAR(500),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## API Endpoints Summary

```
GET    /api/profile           - Get current user profile
PUT    /api/profile           - Update current user profile
GET    /api/profile/:userId   - Get public profile
POST   /api/profile/avatar    - Upload avatar
```

## Testing

Run tests:
```bash
npm test -- profile.test.js
```

Tests verify:
- ✅ SCRUM-109: Profile view/update API
- ✅ SCRUM-110: Image upload validation (5MB limit, formats)
- ✅ SCRUM-111: All field validations

## Frontend Integration Example

```javascript
// View profile
const profile = await fetch('/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Update profile
await fetch('/api/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    full_name: 'New Name',
    skill_level: 'GOOD',
    bio: 'Updated bio'
  })
});

// Upload avatar (assuming image URL from Cloudinary)
await fetch('/api/profile/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_url: 'https://res.cloudinary.com/...'
  })
});
```

## Security Considerations

1. **Authentication Required:** All profile endpoints require valid JWT token
2. **Data Isolation:** Users can only update their own profile
3. **Input Validation:** All fields validated on server side
4. **File Validation:** Image size and type validated before Cloudinary upload
5. **Rate Limiting:** Implement rate limiting on avatar upload (prevent abuse)
6. **HTTPS Only:** Always use HTTPS in production

## Future Enhancements

- [ ] Social media integration (LinkedIn, Facebook)
- [ ] Verification badges for professional players
- [ ] Player statistics dashboard
- [ ] Achievement/badge system
- [ ] Privacy settings (who can see profile)
- [ ] Profile completeness indicator
