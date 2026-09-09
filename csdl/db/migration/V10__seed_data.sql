-- =====================================================================
-- V10 — Dữ liệu mẫu (seed) phục vụ phát triển và demo
-- Mật khẩu mẫu của mọi tài khoản: 123456aA  (đã băm bằng BCrypt)
-- =====================================================================

INSERT INTO district (code, name, province) VALUES
 ('HN_CG',  'Cầu Giấy',      'Hà Nội'),
 ('HN_NTL', 'Nam Từ Liêm',   'Hà Nội'),
 ('HN_TX',  'Thanh Xuân',    'Hà Nội'),
 ('HN_HBT', 'Hai Bà Trưng',  'Hà Nội'),
 ('HN_LB',  'Long Biên',     'Hà Nội'),
 ('HN_HM',  'Hoàng Mai',     'Hà Nội');

INSERT INTO amenity (code, name, icon) VALUES
 ('LIGHT',    'Đèn cao áp',        'bulb'),
 ('PARKING',  'Bãi xe',            'car'),
 ('CANTEEN',  'Căng tin',          'cup'),
 ('WIFI',     'Wifi miễn phí',     'wifi'),
 ('LOCKER',   'Phòng thay đồ',     'door'),
 ('REFEREE',  'Trọng tài',         'whistle');

-- --------------------------------------------------------------- users
INSERT INTO app_user (id, phone, email, password_hash, role, status, phone_verified) VALUES
 (1, '0912345678', 'player1@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (2, '0987654321', 'player2@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (3, '0933111222', 'player3@example.com', '$2a$10$seedseedseedseedseedseXX', 'PLAYER', 'ACTIVE', TRUE),
 (4, '0977111222', 'owner1@example.com',  '$2a$10$seedseedseedseedseedseXX', 'OWNER',  'ACTIVE', TRUE),
 (5, '0977333444', 'owner2@example.com',  '$2a$10$seedseedseedseedseedseXX', 'OWNER',  'ACTIVE', TRUE),
 (9, '0900000000', 'admin@example.com',   '$2a$10$seedseedseedseedseedseXX', 'ADMIN',  'ACTIVE', TRUE);
SELECT setval(pg_get_serial_sequence('app_user','id'), 100);

INSERT INTO user_profile (user_id, full_name, district_code, skill_level, preferred_position, reputation_score, total_matches) VALUES
 (1, 'Nguyễn Văn A', 'HN_CG',  'GOOD',         'DF',  95, 37),
 (2, 'Trần Văn B',   'HN_NTL', 'BEGINNER',     'GK',  62, 11),
 (3, 'Lê Văn C',     'HN_TX',  'INTERMEDIATE', 'FW', 100,  4),
 (4, 'Phạm Văn D',   'HN_CG',  'BEGINNER',     'ANY',100,  0),
 (5, 'Hoàng Văn E',  'HN_NTL', 'BEGINNER',     'ANY',100,  0),
 (9, 'Quản trị hệ thống', 'HN_CG', 'BEGINNER', 'ANY',100,  0);

INSERT INTO team (id, name, captain_id, district_code, skill_level, reputation_score, total_matches) VALUES
 (1, 'FC Bách Khoa',  1, 'HN_CG',  'GOOD',         98, 24),
 (2, 'FC Sông Hồng',  3, 'HN_TX',  'INTERMEDIATE', 85, 11);
SELECT setval(pg_get_serial_sequence('team','id'), 100);

INSERT INTO team_member (team_id, user_id, role_in_team) VALUES
 (1, 1, 'CAPTAIN'), (1, 2, 'MEMBER'), (2, 3, 'CAPTAIN');

-- -------------------------------------------------------------- venues
INSERT INTO venue (id, owner_id, name, address, district_code, latitude, longitude,
                   phone, status, deposit_rate, bank_name, bank_account, bank_holder) VALUES
 (1, 4, 'Sân Cầu Giấy Center', 'Số 12 Trần Thái Tông, Cầu Giấy', 'HN_CG',
     21.030700, 105.782100, '0912345678', 'APPROVED', 0.300,
     'Vietcombank', '0123456789', 'CTY TNHH SAN CAU GIAY'),
 (2, 5, 'Sân Mỹ Đình A', 'Lê Đức Thọ, Nam Từ Liêm', 'HN_NTL',
     21.020500, 105.762300, '0987111222', 'APPROVED', 0.300,
     'Techcombank', '19001234', 'HOANG VAN E'),
 (3, 4, 'Sân Long Biên Sport', '45 Ngọc Lâm, Long Biên', 'HN_LB',
     21.045000, 105.870000, '0977111222', 'PENDING', 0.300, NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('venue','id'), 100);

INSERT INTO venue_amenity (venue_id, amenity_code) VALUES
 (1,'LIGHT'), (1,'CANTEEN'), (1,'PARKING'), (1,'LOCKER'),
 (2,'LIGHT'), (2,'WIFI'), (2,'PARKING'),
 (3,'LIGHT'), (3,'PARKING');

INSERT INTO venue_approval (venue_id, admin_id, action, reason) VALUES
 (1, 9, 'APPROVE', NULL),
 (2, 9, 'APPROVE', NULL),
 (3, NULL, 'SUBMIT', NULL);

INSERT INTO field (id, venue_id, name, type) VALUES
 (1, 1, 'Sân 7 - A', 'F7'), (2, 1, 'Sân 7 - B', 'F7'),
 (3, 1, 'Sân 5 - C', 'F5'), (4, 1, 'Sân 5 - D', 'F5'),
 (5, 2, 'Sân 7 - 1', 'F7'), (6, 2, 'Sân 5 - 2', 'F5');
SELECT setval(pg_get_serial_sequence('field','id'), 100);

INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) VALUES
 (1, 24, 100), (1, 6, 50), (1, 0, 0),
 (2, 24, 100), (2, 12, 50), (2, 0, 0);

-- ------------------------------------------------------------- pricing
-- Khung giờ tính bằng phút từ 00:00: 15:00 = 900, 17:00 = 1020...
INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, multiplier, label) VALUES
 (1, 'F7', 'WEEKDAY', int4range(360, 540),   150000, 0.80, 'Giờ sáng'),
 (1, 'F7', 'WEEKDAY', int4range(540, 900),   180000, 0.90, 'Giờ thấp điểm'),
 (1, 'F7', 'WEEKDAY', int4range(900, 1020),  250000, 1.00, 'Giờ chiều'),
 (1, 'F7', 'WEEKDAY', int4range(1020, 1260), 300000, 1.20, 'Giờ vàng'),
 (1, 'F7', 'WEEKDAY', int4range(1260, 1440), 200000, 0.90, 'Giờ khuya'),
 (1, 'F7', 'WEEKEND', int4range(360, 1020),  280000, 1.10, 'Cuối tuần'),
 (1, 'F7', 'WEEKEND', int4range(1020, 1440), 350000, 1.30, 'Cuối tuần giờ vàng'),
 (1, 'F5', 'WEEKDAY', int4range(360, 1020),  180000, 0.90, 'Sân 5 ngày thường'),
 (1, 'F5', 'WEEKDAY', int4range(1020, 1440), 220000, 1.10, 'Sân 5 giờ vàng'),
 (2, 'F7', 'WEEKDAY', int4range(360, 1020),  200000, 0.90, 'Ngày thường'),
 (2, 'F7', 'WEEKDAY', int4range(1020, 1440), 250000, 1.20, 'Giờ vàng');

INSERT INTO promotion (id, venue_id, type, name, discount_percent,
                       trigger_hours_before, floor_price, is_active) VALUES
 (1, 1, 'FLASH_SALE', 'Flash Sale giờ chót', 20, 2, 120000, TRUE),
 (2, 2, 'FLASH_SALE', 'Xả sân giờ trưa',     25, 2, 100000, TRUE);
INSERT INTO promotion (id, venue_id, type, name, discount_percent, min_contract_months, is_active) VALUES
 (3, 1, 'CONTRACT_DISCOUNT', 'Chiết khấu hợp đồng 3 tháng', 10, 3, TRUE);
SELECT setval(pg_get_serial_sequence('promotion','id'), 100);

INSERT INTO promotion_time_span (promotion_id, time_span) VALUES
 (1, int4range(540, 900)), (1, int4range(1260, 1440)),
 (2, int4range(600, 900));

-- ------------------------------------------------------------ bookings
-- Đơn 1: đã xác nhận, đá vào ngày mai 19:30–21:00 trên sân 7A
INSERT INTO booking (id, code, kind, status, venue_id, user_id, team_id,
                     total_amount, deposit_amount, confirmed_at) VALUES
 (1, 'BK' || to_char(now(), 'YYMMDD') || 'A17', 'SINGLE', 'CONFIRMED', 1, 1, 1,
      450000, 135000, now());

-- Đơn 2: chuyển khoản, chờ chủ sân xác minh bill
INSERT INTO booking (id, code, kind, status, venue_id, user_id,
                     total_amount, deposit_amount) VALUES
 (2, 'BK' || to_char(now(), 'YYMMDD') || 'B02', 'SINGLE', 'PENDING_VERIFY', 2, 3,
      375000, 112500);

-- Đơn 3: chủ sân khóa sân cho khách gọi điện
INSERT INTO booking (id, code, kind, status, venue_id, guest_name, guest_phone,
                     lock_reason, total_amount, deposit_amount) VALUES
 (3, 'LK' || to_char(now(), 'YYMMDD') || 'C11', 'OWNER_LOCK', 'CONFIRMED', 1,
      'Anh Hùng', '0987654321', 'WALK_IN', 0, 0);
SELECT setval(pg_get_serial_sequence('booking','id'), 100);

INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status) VALUES
 (1, 1, (CURRENT_DATE + 1),
     tstzrange((CURRENT_DATE + 1) + TIME '19:30', (CURRENT_DATE + 1) + TIME '21:00', '[)'),
     450000, 'CONFIRMED'),
 (2, 5, (CURRENT_DATE + 2),
     tstzrange((CURRENT_DATE + 2) + TIME '17:00', (CURRENT_DATE + 2) + TIME '18:30', '[)'),
     375000, 'HELD'),
 (3, 3, (CURRENT_DATE + 1),
     tstzrange((CURRENT_DATE + 1) + TIME '16:30', (CURRENT_DATE + 1) + TIME '18:00', '[)'),
     0, 'LOCKED');

INSERT INTO payment (booking_id, method, status, amount, provider_ref, provider_txn_no, paid_at) VALUES
 (1, 'VNPAY', 'SUCCESS', 135000, 'REF-0001', '14237891', now()),
 (2, 'BANK_TRANSFER', 'PENDING', 112500, 'REF-0002', NULL, NULL);

INSERT INTO payment_transaction (payment_id, type, amount, provider, provider_txn_no,
                                 response_code, signature_valid, raw_payload) VALUES
 (1, 'DEPOSIT', 135000, 'VNPAY', '14237891', '00', TRUE,
  '{"vnp_ResponseCode":"00","vnp_Amount":13500000,"vnp_TxnRef":"REF-0001"}'::jsonb);

-- --------------------------------------------------------- matchmaking
INSERT INTO match_post (id, type, status, booking_id, author_user_id, team_id,
                        district_code, play_date, time_span, required_level,
                        deal_note, expires_at) VALUES
 (1, 'TEAM_FINDS_TEAM', 'OPEN', 1, 1, 1, 'HN_CG', (CURRENT_DATE + 1),
     int4range(1170, 1260), 'GOOD', 'Chia 5-5 tiền sân, có trọng tài',
     (CURRENT_DATE + 1) + TIME '19:30');

INSERT INTO match_post (id, type, status, booking_id, author_user_id, team_id,
                        district_code, play_date, time_span, required_level,
                        slots_needed, slots_filled, cost_kind, cost_amount, expires_at) VALUES
 (2, 'TEAM_FINDS_PLAYER', 'OPEN', 1, 1, 1, 'HN_CG', (CURRENT_DATE + 1),
     int4range(1170, 1260), 'INTERMEDIATE', 2, 0, 'FIXED', 30000,
     (CURRENT_DATE + 1) + TIME '19:30');

INSERT INTO match_post (id, type, status, author_user_id, district_code, play_date,
                        time_span, required_level, content, expires_at) VALUES
 (3, 'PLAYER_FINDS_TEAM', 'OPEN', 2, 'HN_NTL', (CURRENT_DATE + 1),
     int4range(1140, 1230), 'BEGINNER', 'Mình đá thủ môn, tối nay rảnh',
     (CURRENT_DATE + 1) + TIME '19:00');
SELECT setval(pg_get_serial_sequence('match_post','id'), 100);

INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, status) VALUES
 (1, 3, 2, 'Đội mình đá đều, kèo chia 5-5 nhé bạn', 'PENDING'),
 (2, 2, NULL, 'Mình đá thủ môn, tối nay tham gia được', 'PENDING');

INSERT INTO match_participant (booking_id, user_id, source, position) VALUES
 (1, 1, 'TEAM', 'DF');

-- --------------------------------------------------------- operations
INSERT INTO reputation_log (user_id, delta, reason, balance_after) VALUES
 (2, -5, 'Huy tham gia truoc gio da 45 phut', 62),
 (1,  1, 'Hoan thanh tran dau dung hen', 95);

INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES
 (1, 'BOOKING_CONFIRMED', 'Đặt sân thành công',
     'Sân Cầu Giấy Center - Sân 7A, 19:30 ngày mai', 'BOOKING', 1),
 (1, 'MATCH_REQUEST', 'FC Sông Hồng xin giao hữu',
     'Có 1 đội gửi yêu cầu giao hữu cho trận của bạn', 'BOOKING', 1);
