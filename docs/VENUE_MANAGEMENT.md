# Venue & Field Management (SCRUM-115-117)

## Overview

This document describes the venue and field management APIs, including CRUD operations, image upload, and field type management.

## SCRUM-115: Venue Management with Coordinates & Amenities

### Create Venue

**Endpoint:** `POST /api/venues`

**Authentication:** Required (OWNER/ADMIN only)

**Request Body:**
```json
{
  "name": "Sân Mỹ Đình",
  "address": "Phạm Hùng, Từ Liêm, Hà Nội",
  "district_code": "TL",
  "phone": "0912345678",
  "latitude": 21.0285,
  "longitude": 105.7845,
  "open_time": "09:00",
  "close_time": "22:00",
  "deposit_rate": 50000,
  "amenities": ["PARKING", "LIGHTING", "TOILET", "CAFE"]
}
```

**Response:**
```json
{
  "message": "Venue created",
  "venue": {
    "id": 1,
    "name": "Sân Mỹ Đình",
    "address": "Phạm Hùng, Từ Liêm, Hà Nội",
    "district_code": "TL",
    "phone": "0912345678",
    "latitude": 21.0285,
    "longitude": 105.7845,
    "status": "PENDING",
    "created_at": "2026-09-23T10:00:00Z"
  }
}
```

### Update Venue

**Endpoint:** `PUT /api/venues/:id`

**Request Body:** (all fields optional)
```json
{
  "name": "New Name",
  "phone": "0987654321",
  "open_time": "08:00",
  "close_time": "23:00",
  "deposit_rate": 60000,
  "amenities": ["PARKING", "LIGHTING", "TOILET"]
}
```

### Delete Venue

**Endpoint:** `DELETE /api/venues/:id`

**Response:**
```json
{
  "message": "Venue deleted"
}
```

**Note:** Cascades delete all related fields, images, and bookings.

### Venue Amenities

Supported amenities:
- `PARKING` - Bãi đỗ xe
- `LIGHTING` - Ánh sáng
- `TOILET` - Nhà vệ sinh
- `CAFE` - Quán cà phê
- `CHANGING_ROOM` - Phòng thay đồ
- `EQUIPMENT_RENTAL` - Cho thuê dụng cụ
- `SHOWER` - Vòi tắm
- `FIRST_AID` - Cấp cứu

## SCRUM-116: Field Management by Type (F5/F7/F11)

### Field Types

| Type | Players | Description |
|------|---------|-------------|
| `F5` | 5v5 | Sân 5 người |
| `F7` | 7v7 | Sân 7 người |
| `F11` | 11v11 | Sân 11 người |

### Create Field

**Endpoint:** `POST /api/fields`

**Authentication:** Required (OWNER/ADMIN only)

**Request Body:**
```json
{
  "venue_id": 1,
  "name": "Sân 1 - F5",
  "type": "F5"
}
```

**Response:**
```json
{
  "message": "Field created",
  "field": {
    "id": 1,
    "venue_id": 1,
    "name": "Sân 1 - F5",
    "type": "F5",
    "is_active": true,
    "created_at": "2026-09-23T10:05:00Z"
  }
}
```

### Update Field

**Endpoint:** `PUT /api/fields/:id`

**Request Body:** (all optional)
```json
{
  "name": "Sân chính - F5",
  "type": "F5",
  "is_active": true
}
```

### Delete Field

**Endpoint:** `DELETE /api/fields/:id`

**Response:**
```json
{
  "message": "Field deleted"
}
```

**Note:** Cascades delete all related bookings and slots.

### List Fields by Type

**Query:** `GET /api/venues/:id`

Returns venue with all fields:
```json
{
  "id": 1,
  "name": "Sân Mỹ Đình",
  "fields": [
    { "id": 1, "name": "Sân 1", "type": "F5", "is_active": true },
    { "id": 2, "name": "Sân 2", "type": "F7", "is_active": true },
    { "id": 3, "name": "Sân 3", "type": "F11", "is_active": true }
  ],
  ...
}
```

## SCRUM-117: Venue Image Upload & Management

### Upload Images

**Endpoint:** `POST /api/venues/:id/images`

**Authentication:** Required (OWNER/ADMIN)

**Request Body:**
```json
{
  "image_urls": [
    "https://res.cloudinary.com/venue/image1.jpg",
    "https://res.cloudinary.com/venue/image2.jpg",
    "https://res.cloudinary.com/venue/image3.jpg"
  ]
}
```

**Response:**
```json
{
  "message": "Images uploaded",
  "images": [
    {
      "id": 1,
      "image_url": "https://res.cloudinary.com/venue/image1.jpg",
      "display_order": 1
    },
    {
      "id": 2,
      "image_url": "https://res.cloudinary.com/venue/image2.jpg",
      "display_order": 2
    },
    {
      "id": 3,
      "image_url": "https://res.cloudinary.com/venue/image3.jpg",
      "display_order": 3
    }
  ]
}
```

### Reorder Images

**Endpoint:** `PUT /api/venues/:id/images/order`

**Request Body:**
```json
{
  "image_ids": [2, 1, 3]
}
```

**Response:**
```json
{
  "message": "Image order updated"
}
```

**Result:**
- Image 2 → display_order 1
- Image 1 → display_order 2
- Image 3 → display_order 3

## Database Schema

### Venue Table
```sql
CREATE TABLE venue (
    id              BIGINT PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    district_code   VARCHAR(10) REFERENCES district(code),
    phone           VARCHAR(10),
    latitude        FLOAT NOT NULL,
    longitude       FLOAT NOT NULL,
    open_time       TIME DEFAULT '09:00',
    close_time      TIME DEFAULT '22:00',
    deposit_rate    INTEGER DEFAULT 0,
    status          venue_status DEFAULT 'PENDING',
    avg_rating      FLOAT DEFAULT 5.0,
    rating_count    INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
);
```

### Field Table
```sql
CREATE TABLE field (
    id              BIGINT PRIMARY KEY,
    venue_id        BIGINT REFERENCES venue(id),
    name            VARCHAR(120),
    type            field_type,  -- F5, F7, F11
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
);
```

### Venue Image Table
```sql
CREATE TABLE venue_image (
    id              BIGINT PRIMARY KEY,
    venue_id        BIGINT REFERENCES venue(id) ON DELETE CASCADE,
    image_url       VARCHAR(500),
    display_order   INTEGER,
    uploaded_at     TIMESTAMPTZ,
    UNIQUE(venue_id, display_order)
);
```

### Venue Amenity Table
```sql
CREATE TABLE venue_amenity (
    venue_id        BIGINT REFERENCES venue(id) ON DELETE CASCADE,
    amenity_code    VARCHAR(50),
    PRIMARY KEY (venue_id, amenity_code)
);
```

## Validation Rules

### Venue Fields

| Field | Constraint |
|-------|-----------|
| `name` | Max 120 chars, non-empty |
| `address` | Max 255 chars |
| `phone` | Format: 10 digits |
| `latitude` | Number -90 to 90 |
| `longitude` | Number -180 to 180 |
| `district_code` | Must exist in district table |
| `open_time` | Format: HH:MM |
| `close_time` | Format: HH:MM |
| `deposit_rate` | Integer ≥ 0 |

### Field Fields

| Field | Constraint |
|-------|-----------|
| `name` | Max 120 chars, non-empty |
| `type` | One of: F5, F7, F11 |
| `venue_id` | Must exist |

## Access Control

| Endpoint | PLAYER | OWNER | ADMIN |
|----------|--------|-------|-------|
| GET /api/venues | ✅ | ✅ | ✅ |
| POST /api/venues | ❌ | ✅ | ✅ |
| PUT /api/venues/:id | ❌ | ✅ | ✅ |
| DELETE /api/venues/:id | ❌ | ✅ | ✅ |
| POST /api/venues/:id/images | ❌ | ✅ | ✅ |
| PUT /api/venues/:id/images/order | ❌ | ✅ | ✅ |
| POST /api/fields | ❌ | ✅ | ✅ |
| PUT /api/fields/:id | ❌ | ✅ | ✅ |
| DELETE /api/fields/:id | ❌ | ✅ | ✅ |
| GET /api/fields/:id/schedule | ✅ | ✅ | ✅ |

## Error Handling

**Invalid Phone Format:**
```json
{
  "error": {
    "code": "INVALID_FIELD",
    "details": { "field": "phone", "reason": "Invalid format" }
  }
}
```

**Invalid Field Type:**
```json
{
  "error": {
    "code": "INVALID_FIELD",
    "details": { "field": "type", "reason": "Must be one of: F5, F7, F11" }
  }
}
```

**Venue Not Found:**
```json
{
  "error": {
    "code": "VENUE_NOT_FOUND"
  }
}
```

## Example Workflow

### 1. Owner creates venue
```bash
POST /api/venues
{
  "name": "Sân Bóng Mỹ Đình",
  "address": "Phạm Hùng, Hà Nội",
  "district_code": "TL",
  "phone": "0912345678",
  "latitude": 21.0285,
  "longitude": 105.7845,
  "amenities": ["PARKING", "LIGHTING", "CAFE"]
}
```

### 2. Owner adds fields
```bash
POST /api/fields
{
  "venue_id": 1,
  "name": "Sân 1",
  "type": "F5"
}

POST /api/fields
{
  "venue_id": 1,
  "name": "Sân 2",
  "type": "F7"
}
```

### 3. Owner uploads images
```bash
POST /api/venues/1/images
{
  "image_urls": ["https://example.com/1.jpg", "https://example.com/2.jpg"]
}
```

### 4. Owner reorders images
```bash
PUT /api/venues/1/images/order
{
  "image_ids": [2, 1]
}
```

### 5. Players view venue
```bash
GET /api/venues/1
→ Returns venue with all fields, images, amenities, prices
```

## Security Notes

- Only OWNER/ADMIN can modify venues and fields
- PLAYER role can only view
- Coordinates validated as geographic (lat/long)
- Phone format strictly validated
- Cascading deletes protect referential integrity
