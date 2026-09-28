# 🎯 Chức năng Đặt Sân - Hướng dẫn Chi tiết

## 📍 Quy Trình Đặt Sân (User Flow)

```
SearchPage (WF-02)
    ↓
VenueDetailPage (WF-03) → Click "Đặt sân ngay"
    ↓
BookingModal → Fill form → Click "Tiếp tục thanh toán"
    ↓
PaymentPage (WF-04) → Complete payment
    ↓
MyBookingsPage (WF-06) → View booking & rate later
```

## 🏗️ Architecture

### Backend (API)
**File:** `backend/src/modules/bookings/bookings.routes.js`

**Endpoints:**
- `POST /api/bookings` - Tạo booking (trạng thái HELD)
- `GET /api/bookings/:code` - Chi tiết booking
- `POST /api/bookings/:code/cancel` - Hủy booking
- `GET /api/bookings` - Lấy danh sách booking của user (implied)

**Database Schema:**
```sql
booking {
  id, code, kind, status, venue_id, user_id,
  total_amount, deposit_amount, hold_expires_at, ...
}

booking_slot {
  booking_id, field_id, play_date, time_range, 
  price, status (HELD/CONFIRMED/LOCKED/RELEASED)
}
```

**Booking State Machine:**
```
HELD (5-15 min) → PENDING_VERIFY → CONFIRMED → IN_PROGRESS → COMPLETED
                                             ↓
                                    CANCELLED_BY_USER/OWNER
```

### Frontend (React)

#### Components

**VenueDetailPage** (`frontend/src/features/venue/VenueDetailPage.jsx`)
- Display venue info, fields, schedule
- Button "Đặt sân ngay" → opens BookingModal
- State: `showBookingModal`, `selectedField`, `selectedDate`

**BookingModal** (`frontend/src/features/venue/BookingModal.jsx`)
- Form for booking with:
  - Date picker (min = today)
  - Time picker (start/end)
  - User info (name, phone - validated)
  - Notes (optional)
- Price summary (estimated)
- Submit → calls `createBooking()` → redirects to payment

**MyBookingsPage** (`frontend/src/features/bookings/MyBookingsPage.jsx`)
- Tabs: Upcoming vs Completed
- Fetch from `getMyBookings()` API
- Actions:
  - Cancel (confirmed bookings)
  - Rate (completed bookings) → 5-star modal
- Status mapping: CONFIRMED → "Sắp tới", COMPLETED → "Đã hoàn thành"

#### Services

**bookings.js** (`frontend/src/services/bookings.js`)
```javascript
createBooking(data)          // POST /api/bookings
getBookingByCode(code)       // GET /api/bookings/:code
getMyBookings()              // GET /api/bookings
cancelBooking(code)          // POST /api/bookings/:code/cancel
rateBooking(code, data)      // POST /api/bookings/:code/rate
```

## 📋 Booking Form Fields

| Field | Type | Required | Validation | Notes |
|-------|------|----------|-----------|-------|
| play_date | Date | ✅ | No past dates | Min = today |
| start | Time | ✅ | HH:MM format | Must < end |
| end | Time | ✅ | HH:MM format | Must > start |
| user_name | String | ❌ | Max 100 chars | Tên người đặt |
| user_phone | String | ✅ | 10 digits (0xxx...) | E.g. 0912345678 |
| note | Text | ❌ | Max 500 chars | Ghi chú thêm |

## 💰 Price Calculation

**Backend Logic** (in `bookings.routes.js` POST handler):
```sql
-- Find price rule matching: venue_id + field_type + day_type + time_range
WITH meta AS (
  SELECT 
    extract(epoch FROM (end - start)) / 3600.0 AS hours,
    CASE WHEN extract(isodow FROM start) >= 6 THEN 'WEEKEND' 
         ELSE 'WEEKDAY' END AS dtype
)
SELECT base_price * multiplier * hours AS total_amount
FROM price_rule pr
WHERE pr.venue_id = $venue_id 
  AND pr.field_type = $field_type
  AND pr.day_type = dtype
  AND pr.time_span @> minute_of_day
```

**Frontend Display:**
- Estimated price (from BookingModal)
- Deposit = 30% of total (mock calculation)
- Final amount shown in PaymentPage

## 🛠️ Development Guide

### Adding to a New Page

```jsx
import BookingModal from '../venue/BookingModal';
import { createBooking } from '../../services/bookings';
import { useNavigate } from 'react-router-dom';

export default function MyPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  
  const handleBookingSuccess = (code) => {
    navigate(`/thanh-toan/${code}`);
  };
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Đặt sân</button>
      
      <BookingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        field={selectedField}
        venue={venueData}
        onSuccess={handleBookingSuccess}
      />
    </>
  );
}
```

### Error Handling

**Common Errors:**
- `FIELD_NOT_FOUND` - Field không tồn tại hoặc không active
- `VENUE_NOT_APPROVED` - Chủ sân chưa được duyệt
- `NO_PRICE_RULE` - Không có giá cho loại sân/giờ này
- `SLOT_TAKEN` - Khung giờ này đã được đặt
- `INVALID_FIELD` - Validation lỗi (phone, date, etc)

**Frontend Response:**
```jsx
.catch(err => {
  if (err.code === 'SLOT_TAKEN') {
    // Show: "Khung giờ này đã có người đặt"
  } else if (err.code === 'NO_PRICE_RULE') {
    // Show: "Không có giá cho khung giờ này, liên hệ sân"
  }
  // ... handle other errors
});
```

## 🧪 Testing Checklist

### Manual Test (After `docker compose up -d` + dev servers)

1. **Navigate to Venue Detail**
   - ✅ Go to `/tim-san` → search venues
   - ✅ Click on venue → see VenueDetailPage
   - ✅ Button "Đặt sân ngay" visible

2. **Open Booking Modal**
   - ✅ Click button → modal appears
   - ✅ Venue & field info displayed
   - ✅ Can select date (no past dates)
   - ✅ Can select start/end time

3. **Fill Form**
   - ✅ Try past date → disabled
   - ✅ Phone: 9 digits → error
   - ✅ Phone: 0912345678 → OK
   - ✅ End time < start time → show error on submit
   - ✅ All fields filled → enable submit button

4. **Submit & Redirect**
   - ✅ Click "Tiếp tục thanh toán"
   - ✅ Should create booking (API call)
   - ✅ Should redirect to `/thanh-toan/BK260928XXXXX`
   - ✅ Loading state shown during request

5. **View My Bookings**
   - ✅ Go to `/lich-cua-toi`
   - ✅ See "Sắp tới" tab with recent booking
   - ✅ See booking details (venue, date, price)
   - ✅ Cancel button clickable → confirm dialog
   - ✅ After completed → move to "Đã hoàn thành" tab
   - ✅ Completed booking → rating button works

### API Testing
```bash
# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "field_id": 1,
    "play_date": "2026-10-05",
    "start": "19:00",
    "end": "20:30",
    "user_id": 123,
    "guest_phone": "0912345678"
  }'
# Response: { code: "BK260928XXXXX", total_amount: 250000, ... }

# Get booking
curl http://localhost:3000/api/bookings/BK260928XXXXX

# Cancel booking
curl -X POST http://localhost:3000/api/bookings/BK260928XXXXX/cancel
```

## 🔄 Integration with Payment Page

**PaymentPage** receives booking code from URL param:
```jsx
const { code } = useParams(); // /thanh-toan/:code
// Fetch booking with getBookingByCode(code)
// Show payment methods (VNPAY, MOMO, Bank transfer)
// After payment success → update booking status to PENDING_VERIFY
```

## 🚀 Future Enhancements

- [ ] Real-time slot availability (WebSocket)
- [ ] Recurring bookings (daily, weekly)
- [ ] Booking history with export
- [ ] Team booking (add friends to booking)
- [ ] Subscription plans (monthly discount)
- [ ] Schedule builder UI (visual calendar)
- [ ] SMS reminders before match time
- [ ] Cancellation penalties & refund rules

## 📞 Support

**Issues to check:**
1. Database running: `docker ps` → see postgres container
2. Backend health: `curl http://localhost:3000/health`
3. Price rules exist: Query `price_rule` table
4. Venue approved: `venue.status = 'APPROVED'`
5. Field active: `field.is_active = true`

**Common Fixes:**
- "Field not found" → Check field_id in request
- "No price rule" → Add price_rule entry for venue/field_type
- "Venue not approved" → Admin must approve from dashboard
- Phone validation fails → Use format: 0 + 9 digits (no spaces/dashes)
