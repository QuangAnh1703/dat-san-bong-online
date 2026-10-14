-- =====================================================================
-- V14 — Seed chủ sân theo quận + cụm sân thực tế tại Hà Nội
-- Tài khoản: <quận không dấu>@gmail.com, ví dụ caugiay@gmail.com; mật khẩu: 123456
-- Tên/địa chỉ/SĐT sân tổng hợp từ sport9.vn, vecgroup.vn; tọa độ là gần đúng theo quận.
-- File được sinh bằng script, không sửa tay.
-- =====================================================================

INSERT INTO district (code, name, province) VALUES
 ('HN_BTL', 'Bắc Từ Liêm', 'Hà Nội'),
 ('HN_BD', 'Ba Đình', 'Hà Nội'),
 ('HN_TH', 'Tây Hồ', 'Hà Nội'),
 ('HN_DD', 'Đống Đa', 'Hà Nội'),
 ('HN_HD', 'Hà Đông', 'Hà Nội')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------ Cầu Giấy (12 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('caugiay@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Cầu Giấy', 'HN_CG' FROM app_user WHERE lower(email) = 'caugiay@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Cao đẳng Múa Hà Nội', 'Ngõ 100 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy', 'HN_CG', 21.040374, 105.798641, '0985136869',
       'Sân bóng Cao đẳng Múa Hà Nội - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '836467540600', 'CHU SAN CAU GIAY', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Cao đẳng Múa Hà Nội')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng chân cầu vượt Mai Dịch', 'Số 1 Phạm Hùng, Mai Dịch, Cầu Giấy', 'HN_CG', 21.045254, 105.806342, '0985531619',
       'Sân bóng chân cầu vượt Mai Dịch - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '267736554201', 'CHU SAN CAU GIAY', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng chân cầu vượt Mai Dịch')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 600000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 870000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 960000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thiên Trường', 'Hoàng Minh Giám, Trung Hòa, Cầu Giấy', 'HN_CG', 21.039037, 105.797834, '0946795885',
       'Sân bóng Thiên Trường - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '440551710202', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Thiên Trường')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng PVV Liên hợp Thể thao', '22 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy', 'HN_CG', 21.038650, 105.783668, '0905731986',
       'Sân bóng PVV Liên hợp Thể thao - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '314320248403', 'CHU SAN CAU GIAY', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng PVV Liên hợp Thể thao')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Yên Hòa 2', 'Nguyễn Phong Sắc, Dịch Vọng Hậu, Cầu Giấy', 'HN_CG', 21.028526, 105.788254, '0372438600',
       'Sân bóng Yên Hòa 2 - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '868028933104', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Yên Hòa 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 680000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 990000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1090000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Quân đội 125 Hoàng Ngân', '125 Hoàng Ngân, Trung Hòa, Cầu Giấy', 'HN_CG', 21.044082, 105.802412, '0858658899',
       'Sân bóng Quân đội 125 Hoàng Ngân - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '519444167805', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Quân đội 125 Hoàng Ngân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 690000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1000000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1100000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Học viện Báo chí', 'Số 36 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy', 'HN_CG', 21.037150, 105.805564, '0437546963',
       'Sân bóng Học viện Báo chí - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '337155664006', 'CHU SAN CAU GIAY', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Học viện Báo chí')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 560000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 810000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 890000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đông Đô', 'Cổng công viên Cầu Giấy, Dịch Vọng Hậu, Cầu Giấy', 'HN_CG', 21.032953, 105.796243, '0986676116',
       'Sân bóng Đông Đô - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '342756009207', 'CHU SAN CAU GIAY', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Đông Đô')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trung Kính Hạ', 'Số 6 Nguyễn Chánh, Trung Hòa, Cầu Giấy', 'HN_CG', 21.026148, 105.785787, '0915144060',
       'Sân bóng Trung Kính Hạ - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '765396565508', 'CHU SAN CAU GIAY', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Trung Kính Hạ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thành Đồng', 'Khu đô thị Nam Trung Yên, Trung Hòa, Cầu Giấy', 'HN_CG', 21.042191, 105.801875, '0945697597',
       'Sân bóng Thành Đồng - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '495496225509', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng Thành Đồng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Sư phạm Hà Nội', '136 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy', 'HN_CG', 21.028356, 105.800752, '0858658899',
       'Sân bóng ĐH Sư phạm Hà Nội - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '622913599210', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng ĐH Sư phạm Hà Nội')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng E9 Phạm Hùng', 'E9 Phạm Hùng (gần Big C Thăng Long), Cầu Giấy', 'HN_CG', 21.026603, 105.797793, '0987884994',
       'Sân bóng E9 Phạm Hùng - sân cỏ nhân tạo tại Cầu Giấy, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '628337884111', 'CHU SAN CAU GIAY', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'caugiay@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'caugiay@gmail.com' AND v.name = 'Sân bóng E9 Phạm Hùng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 690000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1000000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1100000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Nam Từ Liêm (15 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('namtuliem@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Nam Từ Liêm', 'HN_NTL' FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng CT6 The Garden', 'CT6 Khu đô thị Mỹ Đình, Nam Từ Liêm', 'HN_NTL', 21.011956, 105.755970, '0949135909',
       'Sân bóng CT6 The Garden - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '175549915400', 'CHU SAN NAM TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng CT6 The Garden')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Mễ Trì Thượng', 'Châu Văn Liêm, Mễ Trì, Nam Từ Liêm', 'HN_NTL', 21.022890, 105.755477, '0986528891',
       'Sân bóng Mễ Trì Thượng - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '867431176001', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Mễ Trì Thượng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Mỹ Đình 2', '32 đường Mỹ Đình, Mỹ Đình 2, Nam Từ Liêm', 'HN_NTL', 21.011810, 105.755309, '0966116365',
       'Sân bóng Mỹ Đình 2 - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '655466711702', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Mỹ Đình 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 520000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 750000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 830000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Nhân Mỹ', 'Làng Nhân Mỹ, Mỹ Đình 1, Nam Từ Liêm', 'HN_NTL', 21.024040, 105.751573, '0904141089',
       'Sân bóng Nhân Mỹ - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '980563748203', 'CHU SAN NAM TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Nhân Mỹ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng MIC Lương Thế Vinh', '379A Lương Thế Vinh, Trung Văn, Nam Từ Liêm', 'HN_NTL', 21.016585, 105.770927, '0975764173',
       'Sân bóng MIC Lương Thế Vinh - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '362319612604', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng MIC Lương Thế Vinh')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Mirolin Sport Club', 'Lê Đức Thọ (đối diện SVĐ Mỹ Đình), Nam Từ Liêm', 'HN_NTL', 21.025904, 105.765861, '0363035585',
       'Mirolin Sport Club - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '833278850005', 'CHU SAN NAM TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Mirolin Sport Club')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 550000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 800000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 880000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thành Lâm VTC', '108 đường Mỹ Đình, Mỹ Đình 2, Nam Từ Liêm', 'HN_NTL', 21.018003, 105.767244, '0985736869',
       'Sân bóng Thành Lâm VTC - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '118274238706', 'CHU SAN NAM TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Thành Lâm VTC')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng 88 Lê Văn Lương', '88 Lê Văn Lương kéo dài, Trung Văn, Nam Từ Liêm', 'HN_NTL', 21.025733, 105.768438, '0916311498',
       'Sân bóng 88 Lê Văn Lương - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '381992462407', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng 88 Lê Văn Lương')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đình Thôn 2', '85 ngõ 180 Đình Thôn, Mỹ Đình 1, Nam Từ Liêm', 'HN_NTL', 21.005496, 105.751307, NULL,
       'Sân bóng Đình Thôn 2 - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '927144498008', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Đình Thôn 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 510000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 740000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 810000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Garden City Đại Mỗ', 'HH1 FLC Garden City, Đại Mỗ, Nam Từ Liêm', 'HN_NTL', 21.014829, 105.754094, NULL,
       'Sân bóng Garden City Đại Mỗ - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '488684863009', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Garden City Đại Mỗ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng MHDI', 'Chung cư MHDI, Mỹ Đình 2, Nam Từ Liêm', 'HN_NTL', 21.028721, 105.769804, NULL,
       'Sân bóng MHDI - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '373659134010', 'CHU SAN NAM TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng MHDI')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Hải Đăng', '56 Tố Hữu, Trung Văn, Nam Từ Liêm', 'HN_NTL', 21.009265, 105.771573, NULL,
       'Sân bóng Hải Đăng - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '983786905211', 'CHU SAN NAM TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Hải Đăng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Nhuệ Giang', '74 Nhuệ Giang, Tây Mỗ, Nam Từ Liêm', 'HN_NTL', 21.020494, 105.764234, NULL,
       'Sân bóng Nhuệ Giang - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '372989440012', 'CHU SAN NAM TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Nhuệ Giang')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trung tâm VYF', 'Lê Quang Đạo, Mễ Trì, Nam Từ Liêm', 'HN_NTL', 21.015068, 105.756264, NULL,
       'Sân bóng Trung tâm VYF - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '738476172313', 'CHU SAN NAM TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng Trung tâm VYF')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Tài nguyên và Môi trường', '41A Phú Diễn, Cầu Diễn, Nam Từ Liêm', 'HN_NTL', 21.009675, 105.769035, NULL,
       'Sân bóng ĐH Tài nguyên và Môi trường - sân cỏ nhân tạo tại Nam Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '963590085914', 'CHU SAN NAM TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'namtuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'namtuliem@gmail.com' AND v.name = 'Sân bóng ĐH Tài nguyên và Môi trường')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 510000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 740000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 810000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Bắc Từ Liêm (13 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('bactuliem@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Bắc Từ Liêm', 'HN_BTL' FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân vận động Từ Liêm', 'Đường Đức Diễn, Phúc Diễn, Bắc Từ Liêm', 'HN_BTL', 21.079459, 105.756918, NULL,
       'Sân vận động Từ Liêm - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '483067754000', 'CHU SAN BAC TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân vận động Từ Liêm')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 11', 'F11')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 450000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 650000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 720000, 'Cuối tuần'),
          ('F11', 'WEEKDAY', 360, 960, 1320000, 'Giờ thường'),
          ('F11', 'WEEKDAY', 960, 1440, 1910000, 'Giờ vàng'),
          ('F11', 'WEEKEND', 360, 1440, 2100000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng An Bình', 'Số 12A, Cổ Nhuế 1, Bắc Từ Liêm', 'HN_BTL', 21.066443, 105.756414, NULL,
       'Sân bóng An Bình - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '300518673701', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng An Bình')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Phú Diễn', 'Ngõ 193 Phú Diễn, Phú Diễn, Bắc Từ Liêm', 'HN_BTL', 21.070438, 105.765864, NULL,
       'Sân bóng Phú Diễn - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '243313431802', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Phú Diễn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Học viện Cảnh sát', 'Học viện Cảnh sát Nhân dân, Cổ Nhuế 2, Bắc Từ Liêm', 'HN_BTL', 21.066566, 105.755558, NULL,
       'Sân bóng Học viện Cảnh sát - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '456450987003', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Học viện Cảnh sát')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 560000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 810000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 890000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Cổ Nhuế 2', 'Đường Tăng Thiết Giáp, Cổ Nhuế 2, Bắc Từ Liêm', 'HN_BTL', 21.072170, 105.750852, '0982493311',
       'Sân bóng Cổ Nhuế 2 - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '233283579404', 'CHU SAN BAC TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Cổ Nhuế 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 530000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 770000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 850000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân vận động Đông Ngạc', '37D TT Bê tông, Đông Ngạc, Bắc Từ Liêm', 'HN_BTL', 21.061782, 105.763664, NULL,
       'Sân vận động Đông Ngạc - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '583352008605', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân vận động Đông Ngạc')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 11', 'F11')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần'),
          ('F11', 'WEEKDAY', 360, 960, 1500000, 'Giờ thường'),
          ('F11', 'WEEKDAY', 960, 1440, 2180000, 'Giờ vàng'),
          ('F11', 'WEEKEND', 360, 1440, 2400000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Cống Chèm', 'Thụy Phương, Bắc Từ Liêm', 'HN_BTL', 21.061964, 105.764875, NULL,
       'Sân bóng Cống Chèm - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '439079928506', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Cống Chèm')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 520000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 750000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 830000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng T32', 'Cổng số 3 Học viện Cảnh sát, Cổ Nhuế 1, Bắc Từ Liêm', 'HN_BTL', 21.060630, 105.755872, NULL,
       'Sân bóng T32 - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '129339075107', 'CHU SAN BAC TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng T32')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Liên Mạc', 'Mạc Xá, đường Liên Mạc, Bắc Từ Liêm', 'HN_BTL', 21.067799, 105.749069, '0858658899',
       'Sân bóng Liên Mạc - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '980798602508', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Liên Mạc')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ngọa Long', 'Ngõ 136 Cầu Diễn, Minh Khai, Bắc Từ Liêm', 'HN_BTL', 21.078938, 105.749449, '0858658899',
       'Sân bóng Ngọa Long - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '443403381209', 'CHU SAN BAC TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Ngọa Long')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 530000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 770000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 850000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Dewey Starlake', 'Khu đô thị Starlake, Xuân Tảo, Bắc Từ Liêm', 'HN_BTL', 21.060293, 105.767187, NULL,
       'Sân bóng Dewey Starlake - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '662112903810', 'CHU SAN BAC TU LIEM', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Dewey Starlake')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Học viện Tài chính', '69 Đức Thắng, Đức Thắng, Bắc Từ Liêm', 'HN_BTL', 21.072452, 105.762238, NULL,
       'Sân bóng Học viện Tài chính - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '380039572811', 'CHU SAN BAC TU LIEM', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng Học viện Tài chính')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng KCN Từ Liêm', 'Phố Thanh Lâm, Minh Khai, Bắc Từ Liêm', 'HN_BTL', 21.066758, 105.762839, NULL,
       'Sân bóng KCN Từ Liêm - sân cỏ nhân tạo tại Bắc Từ Liêm, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '347061598412', 'CHU SAN BAC TU LIEM', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'bactuliem@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'bactuliem@gmail.com' AND v.name = 'Sân bóng KCN Từ Liêm')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Thanh Xuân (12 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('thanhxuan@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Thanh Xuân', 'HN_TX' FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Top Group', 'Ngã 3 Lê Văn Lương - Khuất Duy Tiến, Thanh Xuân', 'HN_TX', 20.999324, 105.819219, '0856891616',
       'Sân bóng Top Group - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '856993225500', 'CHU SAN THANH XUAN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Top Group')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Phòng Không', 'Số 3 Lê Trọng Tấn, Khương Mai, Thanh Xuân', 'HN_TX', 20.986351, 105.820022, '0858658899',
       'Sân bóng Phòng Không - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '438013830901', 'CHU SAN THANH XUAN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Phòng Không')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Viettel 1', 'Ngách 155/206 Trường Chinh, Phương Liệt, Thanh Xuân', 'HN_TX', 20.993315, 105.816069, '0858658899',
       'Sân bóng Viettel 1 - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '132954505102', 'CHU SAN THANH XUAN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Viettel 1')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 590000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 860000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 950000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Kiệt Hoàng Minh Giám', 'Hoàng Minh Giám, Nhân Chính, Thanh Xuân', 'HN_TX', 21.001921, 105.801638, '0978102022',
       'Sân bóng Minh Kiệt Hoàng Minh Giám - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '116762197003', 'CHU SAN THANH XUAN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Minh Kiệt Hoàng Minh Giám')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Khương Hạ', 'Phố Khương Hạ, Khương Đình, Thanh Xuân', 'HN_TX', 20.991035, 105.808132, '0987866389',
       'Sân bóng Khương Hạ - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '289604604304', 'CHU SAN THANH XUAN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Khương Hạ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Bộ Công an Cầu Dậu', '369 Cầu Dậu, Nguyễn Xiển, Thanh Xuân', 'HN_TX', 21.004010, 105.817679, '0858885555',
       'Sân bóng Bộ Công an Cầu Dậu - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '615098071305', 'CHU SAN THANH XUAN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Bộ Công an Cầu Dậu')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thượng Đình', '129 Nguyễn Trãi, Thượng Đình, Thanh Xuân', 'HN_TX', 20.989812, 105.803762, '0842347826',
       'Sân bóng Thượng Đình - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '791276717506', 'CHU SAN THANH XUAN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Thượng Đình')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Nhà Văn hóa Thanh Xuân', '186 Khuất Duy Tiến, Nhân Chính, Thanh Xuân', 'HN_TX', 20.983067, 105.800822, '0866255526',
       'Sân bóng Nhà Văn hóa Thanh Xuân - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '999731564907', 'CHU SAN THANH XUAN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Nhà Văn hóa Thanh Xuân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Sơn Trang 2', 'Số 1 Hoàng Minh Giám, Nhân Chính, Thanh Xuân', 'HN_TX', 20.990270, 105.799918, '0988005065',
       'Sân bóng Sơn Trang 2 - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '302044204008', 'CHU SAN THANH XUAN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Sơn Trang 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng VSA', '25D Lê Trọng Tấn, Khương Mai, Thanh Xuân', 'HN_TX', 20.982955, 105.804286, '0977641696',
       'Sân bóng VSA - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '592720294209', 'CHU SAN THANH XUAN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng VSA')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 560000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 810000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 890000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Tháng Giêng', 'Số 25 Nguyễn Huy Tưởng, Thanh Xuân Trung, Thanh Xuân', 'HN_TX', 20.993453, 105.816504, '0904713268',
       'Sân bóng Tháng Giêng - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '750471011110', 'CHU SAN THANH XUAN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Tháng Giêng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 530000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 770000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 850000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Giáp Nhất', 'Ngõ 72 Nguyễn Trãi, Nhân Chính, Thanh Xuân', 'HN_TX', 21.005081, 105.818550, '0882454115',
       'Sân bóng Giáp Nhất - sân cỏ nhân tạo tại Thanh Xuân, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '697407126711', 'CHU SAN THANH XUAN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'thanhxuan@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'thanhxuan@gmail.com' AND v.name = 'Sân bóng Giáp Nhất')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Hai Bà Trưng (10 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('haibatrung@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Hai Bà Trưng', 'HN_HBT' FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng KTX ĐH Bách Khoa', '34 Tạ Quang Bửu, Bách Khoa, Hai Bà Trưng', 'HN_HBT', 21.006002, 105.848144, '0438680186',
       'Sân bóng KTX ĐH Bách Khoa - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '402348202600', 'CHU SAN HAI BA TRUNG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng KTX ĐH Bách Khoa')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 700000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1020000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1120000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Công viên Tuổi Trẻ', 'Số 46 Thanh Nhàn, Thanh Nhàn, Hai Bà Trưng', 'HN_HBT', 21.014734, 105.846246, '0858658899',
       'Sân bóng Công viên Tuổi Trẻ - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '682326138201', 'CHU SAN HAI BA TRUNG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Công viên Tuổi Trẻ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân vận động ĐH Bách Khoa', 'A1 Lê Thanh Nghị, Bách Khoa, Hai Bà Trưng', 'HN_HBT', 21.012563, 105.865055, '0438680186',
       'Sân vận động ĐH Bách Khoa - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '903090420702', 'CHU SAN HAI BA TRUNG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân vận động ĐH Bách Khoa')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 11', 'F11')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần'),
          ('F11', 'WEEKDAY', 360, 960, 1760000, 'Giờ thường'),
          ('F11', 'WEEKDAY', 960, 1440, 2550000, 'Giờ vàng'),
          ('F11', 'WEEKEND', 360, 1440, 2810000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Vĩnh Tuy 30', 'Ngõ 122 Vĩnh Tuy, Vĩnh Tuy, Hai Bà Trưng', 'HN_HBT', 21.014559, 105.856922, '0833439999',
       'Sân bóng Vĩnh Tuy 30 - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '270320165203', 'CHU SAN HAI BA TRUNG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Vĩnh Tuy 30')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 680000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 990000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1090000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thanh Nhàn', 'Đối diện 187 Thanh Nhàn, Hai Bà Trưng', 'HN_HBT', 21.007865, 105.863251, '0984420372',
       'Sân bóng Thanh Nhàn - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '894001058104', 'CHU SAN HAI BA TRUNG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Thanh Nhàn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 390000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 570000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 630000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 710000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1030000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1130000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Kiệt Nguyễn An Ninh', 'Ngõ 104 Nguyễn An Ninh, Trương Định, Hai Bà Trưng', 'HN_HBT', 20.999746, 105.857255, '0964434433',
       'Sân bóng Minh Kiệt Nguyễn An Ninh - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '514618444605', 'CHU SAN HAI BA TRUNG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Minh Kiệt Nguyễn An Ninh')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'SportLand Vĩnh Tuy', 'Số 25 ngõ 122 Vĩnh Tuy, Hai Bà Trưng', 'HN_HBT', 21.001814, 105.852724, '0359984845',
       'SportLand Vĩnh Tuy - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '125896191606', 'CHU SAN HAI BA TRUNG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'SportLand Vĩnh Tuy')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 600000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 870000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 960000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Kiệt Đại La', '44 Đại La, Đồng Tâm, Hai Bà Trưng', 'HN_HBT', 20.998752, 105.852965, '0964434433',
       'Sân bóng Minh Kiệt Đại La - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '814221728107', 'CHU SAN HAI BA TRUNG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Minh Kiệt Đại La')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Times City', 'Khu đô thị Times City, Vĩnh Tuy, Hai Bà Trưng', 'HN_HBT', 20.999054, 105.849039, NULL,
       'Sân bóng Times City - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '182842144408', 'CHU SAN HAI BA TRUNG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng Times City')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 620000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 900000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 990000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Kinh tế Quốc dân', 'Ngõ Tự Do, Đồng Tâm, Hai Bà Trưng', 'HN_HBT', 21.009351, 105.858953, NULL,
       'Sân bóng ĐH Kinh tế Quốc dân - sân cỏ nhân tạo tại Hai Bà Trưng, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '447102523009', 'CHU SAN HAI BA TRUNG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'haibatrung@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'haibatrung@gmail.com' AND v.name = 'Sân bóng ĐH Kinh tế Quốc dân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 680000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 990000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1090000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Long Biên (15 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('longbien@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Long Biên', 'HN_LB' FROM app_user WHERE lower(email) = 'longbien@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đường sắt Long Biên', 'Số 2 ngõ 167 Gia Quất, Thượng Thanh, Long Biên', 'HN_LB', 21.048122, 105.890466, '0911371801',
       'Sân bóng Đường sắt Long Biên - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '778175843000', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Đường sắt Long Biên')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 450000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 650000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 720000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Long Biên', '1 Phúc Tân - 301 Hồng Hà, Long Biên', 'HN_LB', 21.043024, 105.889169, '0969799235',
       'Sân bóng Long Biên - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '127259826601', 'CHU SAN LONG BIEN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Long Biên')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 460000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 670000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 740000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ven Đê 1', '138 Phú Viên, Bồ Đề, Long Biên', 'HN_LB', 21.045283, 105.896344, '0328875038',
       'Sân bóng Ven Đê 1 - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '764194345702', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Ven Đê 1')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 470000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 680000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 750000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ven Đê 2', '302 Phú Viên, Bồ Đề, Long Biên', 'HN_LB', 21.045946, 105.900282, '0944341979',
       'Sân bóng Ven Đê 2 - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '630151057403', 'CHU SAN LONG BIEN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Ven Đê 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 470000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 680000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 750000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ngọc Thụy', 'Ngách 268/21 Gia Thượng, Ngọc Thụy, Long Biên', 'HN_LB', 21.048550, 105.878386, NULL,
       'Sân bóng Ngọc Thụy - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '473546850804', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Ngọc Thụy')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng CT10 Việt Hưng', 'Khu đô thị Việt Hưng, Long Biên', 'HN_LB', 21.044929, 105.880992, NULL,
       'Sân bóng CT10 Việt Hưng - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '278955590805', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng CT10 Việt Hưng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Nguyễn Sơn', '360 Nguyễn Văn Cừ, Gia Thụy, Long Biên', 'HN_LB', 21.034975, 105.899500, '0912234567',
       'Sân bóng Nguyễn Sơn - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '440036833406', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Nguyễn Sơn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Vinhomes Riverside', 'Khu đô thị Vinhomes Riverside, Phúc Lợi, Long Biên', 'HN_LB', 21.043964, 105.879401, '0969089999',
       'Sân bóng Vinhomes Riverside - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '158864295507', 'CHU SAN LONG BIEN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Vinhomes Riverside')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Chương Dương', 'Bồ Đề, Long Biên', 'HN_LB', 21.039998, 105.894371, '0988169439',
       'Sân bóng Chương Dương - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '878860310008', 'CHU SAN LONG BIEN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Chương Dương')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ven Đê 4', 'Số 8 phố Bồ Đề, Long Biên', 'HN_LB', 21.038712, 105.885643, '0333186666',
       'Sân bóng Ven Đê 4 - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '665746277809', 'CHU SAN LONG BIEN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Ven Đê 4')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 570000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 830000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 910000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thạch Cầu', 'Khu Mô Đền, Lâm Du, Bồ Đề, Long Biên', 'HN_LB', 21.034017, 105.896508, '0976816869',
       'Sân bóng Thạch Cầu - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '437944844510', 'CHU SAN LONG BIEN', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Thạch Cầu')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 480000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 700000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 770000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ái Mộ', '99 Ái Mộ, Bồ Đề, Long Biên', 'HN_LB', 21.045875, 105.879926, '0904397766',
       'Sân bóng Ái Mộ - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '712564611711', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Ái Mộ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 470000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 680000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 750000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Z133', 'Ngõ 99 Đức Giang, Ngọc Thụy, Long Biên', 'HN_LB', 21.055568, 105.891945, '0858658899',
       'Sân bóng Z133 - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '935389447612', 'CHU SAN LONG BIEN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Z133')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 500000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 730000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 800000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Garden City Thạch Bàn', 'Tổ 12 đường Thạch Bàn, Thạch Bàn, Long Biên', 'HN_LB', 21.048596, 105.893540, '0383694954',
       'Sân bóng Garden City Thạch Bàn - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '532196355013', 'CHU SAN LONG BIEN', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Garden City Thạch Bàn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 450000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 650000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 720000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Hòa Bình', 'Chân cầu Vĩnh Tuy, Thượng Thanh, Long Biên', 'HN_LB', 21.056951, 105.886555, '0336912636',
       'Sân bóng Hòa Bình - sân cỏ nhân tạo tại Long Biên, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '175418269214', 'CHU SAN LONG BIEN', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'longbien@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'longbien@gmail.com' AND v.name = 'Sân bóng Hòa Bình')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 490000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 710000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 780000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Hoàng Mai (10 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('hoangmai@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Hoàng Mai', 'HN_HM' FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Định Công', 'Ngõ 99 Định Công Hạ, Định Công, Hoàng Mai', 'HN_HM', 20.970787, 105.857235, '0855155885',
       'Sân bóng Định Công - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '679948413600', 'CHU SAN HOANG MAI', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Định Công')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Bộ Công an Mai Động', 'Số 1 ngõ 299 Hoàng Mai, Mai Động, Hoàng Mai', 'HN_HM', 20.978158, 105.847582, '0835891878',
       'Sân bóng Bộ Công an Mai Động - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '686522105601', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Bộ Công an Mai Động')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng BKC Sport', '58 Linh Đường, Hoàng Liệt, Hoàng Mai', 'HN_HM', 20.976970, 105.852388, '0833878555',
       'Sân bóng BKC Sport - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '671465337502', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng BKC Sport')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Lĩnh Nam', '74 Thúy Lĩnh, Lĩnh Nam, Hoàng Mai', 'HN_HM', 20.980553, 105.849525, '0942572666',
       'Sân bóng Lĩnh Nam - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '328392672603', 'CHU SAN HOANG MAI', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Lĩnh Nam')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 550000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 800000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 880000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Hồ Đền Lừ', 'Ngã 3 Đền Lừ, Tân Mai, Hoàng Mai', 'HN_HM', 20.979769, 105.857525, '0856777779',
       'Sân bóng Hồ Đền Lừ - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '271528768604', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Hồ Đền Lừ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 550000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 800000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 880000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Linh Đàm', 'Ngõ 32 Linh Đường, Hoàng Liệt, Hoàng Mai', 'HN_HM', 20.981890, 105.853098, '0903429669',
       'Sân bóng Linh Đàm - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '856820786305', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Linh Đàm')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đại Từ', 'Đặng Xuân Bảng, Đại Kim, Hoàng Mai', 'HN_HM', 20.969307, 105.839386, '0987652589',
       'Sân bóng Đại Từ - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '158784365606', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Đại Từ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 590000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 860000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 950000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng 226 Vĩnh Hưng', '226 Vĩnh Hưng, Vĩnh Hưng, Hoàng Mai', 'HN_HM', 20.965111, 105.848786, '0945148867',
       'Sân bóng 226 Vĩnh Hưng - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '158222845207', 'CHU SAN HOANG MAI', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng 226 Vĩnh Hưng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Pháp Vân', 'Khu đô thị Pháp Vân - Tứ Hiệp, Hoàng Liệt, Hoàng Mai', 'HN_HM', 20.964913, 105.839370, '0333457274',
       'Sân bóng Pháp Vân - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '561974024908', 'CHU SAN HOANG MAI', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Pháp Vân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 540000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 780000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 860000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Tân Mai', '250 Tân Mai, Tân Mai, Hoàng Mai', 'HN_HM', 20.974236, 105.850568, '0914626883',
       'Sân bóng Tân Mai - sân cỏ nhân tạo tại Hoàng Mai, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '717673576109', 'CHU SAN HOANG MAI', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hoangmai@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hoangmai@gmail.com' AND v.name = 'Sân bóng Tân Mai')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Ba Đình (11 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('badinh@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Ba Đình', 'HN_BD' FROM app_user WHERE lower(email) = 'badinh@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Viglacera', '671 Hoàng Hoa Thám, Vĩnh Phúc, Ba Đình', 'HN_BD', 21.031135, 105.828450, '0904646025',
       'Sân bóng Viglacera - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '460429668500', 'CHU SAN BA DINH', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Viglacera')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 400000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 580000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 640000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng 10-10 Hồng Hà', '15A Hồng Hà, Phúc Xá, Ba Đình', 'HN_BD', 21.038684, 105.808895, '0858658899',
       'Sân bóng 10-10 Hồng Hà - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '941311550501', 'CHU SAN BA DINH', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng 10-10 Hồng Hà')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 390000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 570000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 630000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 720000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1040000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1140000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trường Thể thao Thiếu niên 10-10', 'Khu tập thể Giảng Võ, Giảng Võ, Ba Đình', 'HN_BD', 21.024306, 105.823212, NULL,
       'Sân bóng Trường Thể thao Thiếu niên 10-10 - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '913598350002', 'CHU SAN BA DINH', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Trường Thể thao Thiếu niên 10-10')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 740000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1070000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1180000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Vạn Phúc', 'Số 73 Vạn Bảo, Liễu Giai, Ba Đình', 'HN_BD', 21.026100, 105.826008, '0438462737',
       'Sân bóng Vạn Phúc - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '657402622903', 'CHU SAN BA DINH', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Vạn Phúc')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 710000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1030000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1130000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Phúc Xá 1', 'Tân Ấp, Phúc Xá, Ba Đình', 'HN_BD', 21.030557, 105.814004, '0439185111',
       'Sân bóng Phúc Xá 1 - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '484551766604', 'CHU SAN BA DINH', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Phúc Xá 1')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Phúc Xá 2', '15 Hồng Hà, Phúc Xá, Ba Đình', 'HN_BD', 21.025635, 105.821676, '0437170697',
       'Sân bóng Phúc Xá 2 - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '893936229105', 'CHU SAN BA DINH', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Phúc Xá 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Hồng Hà', 'Đường Hồng Hà, Phúc Xá, Ba Đình', 'HN_BD', 21.044146, 105.819052, '0942418158',
       'Sân bóng Hồng Hà - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '902867046306', 'CHU SAN BA DINH', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Hồng Hà')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 390000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 570000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 630000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 750000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1090000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1200000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Quần Ngựa', 'Văn Cao, Ngọc Hà, Ba Đình', 'HN_BD', 21.032101, 105.821262, '0936356393',
       'Sân bóng Quần Ngựa - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '319484198107', 'CHU SAN BA DINH', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Quần Ngựa')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 680000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 990000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1090000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đại Việt', '24 Nguyễn Công Hoan, Ngọc Khánh, Ba Đình', 'HN_BD', 21.042208, 105.814624, '0944199376',
       'Sân bóng Đại Việt - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '914960670808', 'CHU SAN BA DINH', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Đại Việt')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 650000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 940000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1030000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trường Phạm Hồng Thái', '1 Nguyễn Văn Ngọc, Cống Vị, Ba Đình', 'HN_BD', 21.036641, 105.824105, '0906561199',
       'Sân bóng Trường Phạm Hồng Thái - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '181333482309', 'CHU SAN BA DINH', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Trường Phạm Hồng Thái')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 650000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 940000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1030000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trường PT Thực Nghiệm', '50 Liễu Giai, Cống Vị, Ba Đình', 'HN_BD', 21.030633, 105.816860, NULL,
       'Sân bóng Trường PT Thực Nghiệm - sân cỏ nhân tạo tại Ba Đình, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '208609724010', 'CHU SAN BA DINH', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'badinh@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'badinh@gmail.com' AND v.name = 'Sân bóng Trường PT Thực Nghiệm')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Tây Hồ (14 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('tayho@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Tây Hồ', 'HN_TH' FROM app_user WHERE lower(email) = 'tayho@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Quân Xuân La', '101 Xuân La, Xuân La, Tây Hồ', 'HN_TH', 21.073798, 105.808967, '0913210774',
       'Sân bóng Minh Quân Xuân La - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '620355522800', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Minh Quân Xuân La')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng An Dương', 'Ngõ 76 An Dương, Yên Phụ, Tây Hồ', 'HN_TH', 21.074909, 105.829671, '0984380888',
       'Sân bóng An Dương - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '341931739501', 'CHU SAN TAY HO', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng An Dương')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Quân Quảng An', 'Số 6 Đặng Thai Mai, Quảng An, Tây Hồ', 'HN_TH', 21.080876, 105.821098, '0858658899',
       'Sân bóng Minh Quân Quảng An - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '444447162902', 'CHU SAN TAY HO', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Minh Quân Quảng An')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 600000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 870000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 960000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng THPT Chu Văn An', 'Số 10 Thụy Khuê, Thụy Khuê, Tây Hồ', 'HN_TH', 21.067523, 105.814191, '0438233139',
       'Sân bóng THPT Chu Văn An - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '983107340703', 'CHU SAN TAY HO', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng THPT Chu Văn An')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 600000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 870000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 960000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Bầu Trời Xanh', 'Công viên nước Hồ Tây, Quảng An, Tây Hồ', 'HN_TH', 21.075630, 105.830388, '0966601545',
       'Sân bóng Bầu Trời Xanh - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '222640359404', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Bầu Trời Xanh')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 580000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 840000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 920000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng La Thành', 'Số 81 Võ Chí Công, Xuân La, Tây Hồ', 'HN_TH', 21.058465, 105.831474, '0858658899',
       'Sân bóng La Thành - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '790628937205', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng La Thành')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Trịnh Công Sơn', 'Phố Trịnh Công Sơn, Nhật Tân, Tây Hồ', 'HN_TH', 21.065917, 105.818767, NULL,
       'Sân bóng Trịnh Công Sơn - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '797766590406', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Trịnh Công Sơn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 320000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 460000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 510000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 630000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 910000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1000000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thái Bình Group', 'CT34 Xuân La, Tây Hồ', 'HN_TH', 21.074858, 105.810300, NULL,
       'Sân bóng Thái Bình Group - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '381574761907', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Thái Bình Group')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 330000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 480000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 530000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 680000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 990000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1090000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Ruby Quảng Bá', '56 đường Tây Hồ, Quảng An, Tây Hồ', 'HN_TH', 21.068654, 105.831454, NULL,
       'Sân bóng Ruby Quảng Bá - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '394265794808', 'CHU SAN TAY HO', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Ruby Quảng Bá')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đại Phát', 'Ngõ 353 An Dương Vương, Phú Thượng, Tây Hồ', 'HN_TH', 21.058199, 105.829241, NULL,
       'Sân bóng Đại Phát - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '277992060809', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Đại Phát')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 610000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 880000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 970000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng THPT Tây Hồ', '143 Phú Thượng, Phú Thượng, Tây Hồ', 'HN_TH', 21.068144, 105.831707, NULL,
       'Sân bóng THPT Tây Hồ - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '819483900410', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng THPT Tây Hồ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Sunshine Riverside', 'Đường Võ Chí Công, Phú Thượng, Tây Hồ', 'HN_TH', 21.080011, 105.809406, NULL,
       'Sân bóng Sunshine Riverside - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '523929894111', 'CHU SAN TAY HO', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Sunshine Riverside')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 550000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 800000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 880000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Tô Ngọc Vân', '52A Tô Ngọc Vân, Nhật Tân, Tây Hồ', 'HN_TH', 21.070759, 105.808842, NULL,
       'Sân bóng Tô Ngọc Vân - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '202868402012', 'CHU SAN TAY HO', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Tô Ngọc Vân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đông Đô Tứ Liên', 'An Dương, Tứ Liên, Tây Hồ', 'HN_TH', 21.068565, 105.825862, NULL,
       'Sân bóng Đông Đô Tứ Liên - sân cỏ nhân tạo tại Tây Hồ, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '123278677413', 'CHU SAN TAY HO', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'tayho@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'tayho@gmail.com' AND v.name = 'Sân bóng Đông Đô Tứ Liên')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 340000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 490000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 540000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Đống Đa (10 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('dongda@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Đống Đa', 'HN_DD' FROM app_user WHERE lower(email) = 'dongda@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Phòng Không - Không Quân', 'Số 1 Trường Chinh, Ngã Tư Sở, Đống Đa', 'HN_DD', 21.002289, 105.833988, '0989836795',
       'Sân bóng Phòng Không - Không Quân - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '791377783100', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng Phòng Không - Không Quân')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 620000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 900000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 990000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Y Hà Nội', 'Số 1 Tôn Thất Tùng, Kim Liên, Đống Đa', 'HN_DD', 21.012757, 105.834968, '0933876822',
       'Sân bóng ĐH Y Hà Nội - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '244063806601', 'CHU SAN DONG DA', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng ĐH Y Hà Nội')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Thủy Lợi', 'Ngõ 95 Chùa Bộc, Trung Liệt, Đống Đa', 'HN_DD', 21.014271, 105.831484, '0976299980',
       'Sân bóng ĐH Thủy Lợi - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '707667970902', 'CHU SAN DONG DA', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng ĐH Thủy Lợi')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 590000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 860000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 950000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Kim Liên', 'Số 15 Hoàng Tích Trí, Kim Liên, Đống Đa', 'HN_DD', 21.009012, 105.832383, '0904136138',
       'Sân bóng Kim Liên - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '820989263303', 'CHU SAN DONG DA', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng Kim Liên')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 380000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 550000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 610000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Artex Thăng Long', 'Số 60 Thịnh Hào 1, Tôn Đức Thắng, Đống Đa', 'HN_DD', 21.001027, 105.824256, '0942237335',
       'Sân bóng Artex Thăng Long - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '496917796304', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng Artex Thăng Long')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 640000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 930000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1020000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Công Đoàn', '169 Tây Sơn, Quang Trung, Đống Đa', 'HN_DD', 21.018214, 105.816944, '0979912791',
       'Sân bóng ĐH Công Đoàn - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '733418572205', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng ĐH Công Đoàn')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 400000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 580000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 640000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 720000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 1040000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 1140000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Ngoại Thương', '91 Chùa Láng, Láng Thượng, Đống Đa', 'HN_DD', 21.004727, 105.835278, '0912234567',
       'Sân bóng ĐH Ngoại Thương - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '588030183506', 'CHU SAN DONG DA', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng ĐH Ngoại Thương')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 370000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 540000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 590000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng 69 Hoàng Cầu', 'Số 69 Hoàng Cầu, Ô Chợ Dừa, Đống Đa', 'HN_DD', 21.020680, 105.821552, '0985296589',
       'Sân bóng 69 Hoàng Cầu - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '399157929507', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng 69 Hoàng Cầu')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 350000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 510000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 560000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Chùa Láng', '112 Chùa Láng, Láng Thượng, Đống Đa', 'HN_DD', 21.009021, 105.813950, '0961629889',
       'Sân bóng Chùa Láng - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'ACB', '358271944608', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng Chùa Láng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 390000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 570000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 630000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Học viện Ngân hàng', 'Số 12 Chùa Bộc, Quang Trung, Đống Đa', 'HN_DD', 21.024042, 105.829395, '0978987737',
       'Sân bóng Học viện Ngân hàng - sân cỏ nhân tạo tại Đống Đa, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '730503359709', 'CHU SAN DONG DA', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'dongda@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'dongda@gmail.com' AND v.name = 'Sân bóng Học viện Ngân hàng')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 360000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 520000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 570000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

-- ------------------------------------------------------------ Hà Đông (15 cụm sân)
INSERT INTO app_user (email, password_hash, role, status, phone_verified)
VALUES ('hadong@gmail.com', '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy', 'OWNER', 'ACTIVE', TRUE);
INSERT INTO user_profile (user_id, full_name, district_code)
SELECT id, 'Chủ sân Hà Đông', 'HN_HD' FROM app_user WHERE lower(email) = 'hadong@gmail.com';

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Zon9', 'Khu đô thị Văn Quán, Văn Quán, Hà Đông', 'HN_HD', 20.962992, 105.782649, '0917698989',
       'Sân bóng Zon9 - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '201283752900', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Zon9')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 520000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 750000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 830000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng C500', 'Học viện An ninh Nhân dân, Văn Quán, Hà Đông', 'HN_HD', 20.977266, 105.783359, '0966886500',
       'Sân bóng C500 - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '490464857401', 'CHU SAN HA DONG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng C500')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Cường Quốc 2', 'Đa Sỹ, Kiến Hưng, Hà Đông', 'HN_HD', 20.967551, 105.780014, '0962611167',
       'Sân bóng Cường Quốc 2 - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VietinBank', '524784016802', 'CHU SAN HA DONG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Cường Quốc 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 480000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 700000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 770000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Hà Trì', 'Hà Trì, Hà Cầu, Hà Đông', 'HN_HD', 20.968892, 105.767398, '0896860004',
       'Sân bóng Hà Trì - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '773216760403', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Hà Trì')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 5 - D', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 560000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 810000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 890000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Bình Minh 2', 'Công viên thể thao Hà Đông, Cầu Đơ, Kiến Hưng, Hà Đông', 'HN_HD', 20.979402, 105.764751, '0366311182',
       'Sân bóng Bình Minh 2 - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '622643769004', 'CHU SAN HA DONG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Bình Minh 2')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 250000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 360000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 400000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 510000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 740000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 810000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Đa Sỹ', 'Ngõ 21 làng Đa Sỹ, Kiến Hưng, Hà Đông', 'HN_HD', 20.972654, 105.769724, '0776339330',
       'Sân bóng Đa Sỹ - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '466075182105', 'CHU SAN HA DONG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Đa Sỹ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 310000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 450000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 500000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 500000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 730000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 800000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Cầu Đơ', '46 Lê Hồng Phong, Nguyễn Trãi, Hà Đông', 'HN_HD', 20.972388, 105.782605, '0356525327',
       'Sân bóng Cầu Đơ - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Techcombank', '636994043206', 'CHU SAN HA DONG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Cầu Đơ')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Mậu Lương', 'Đường Mậu Lương, Kiến Hưng, Hà Đông', 'HN_HD', 20.969135, 105.783186, '0963161719',
       'Sân bóng Mậu Lương - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '378609848107', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Mậu Lương')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 520000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 750000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 830000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Thắng Lợi', 'NO33-LK07 Hà Trì, Hà Cầu, Hà Đông', 'HN_HD', 20.979441, 105.767701, '0933565589',
       'Sân bóng Thắng Lợi - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'TPBank', '927429831408', 'CHU SAN HA DONG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Thắng Lợi')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Bắc Việt 3', 'Đường Tô Hiệu, Hà Cầu, Hà Đông', 'HN_HD', 20.973345, 105.767403, '0987189308',
       'Sân bóng Bắc Việt 3 - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'BIDV', '955679178609', 'CHU SAN HA DONG', '05:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Bắc Việt 3')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 270000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 390000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 430000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng ĐH Hà Nội', 'Km9 Nguyễn Trãi, Văn Quán, Hà Đông', 'HN_HD', 20.960803, 105.781346, '0912094468',
       'Sân bóng ĐH Hà Nội - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '780403390810', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng ĐH Hà Nội')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 470000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 680000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 750000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng La Khê', 'Ngã ba Lý Tự Trọng - Ngô Đình Mẫn, La Khê, Hà Đông', 'HN_HD', 20.965940, 105.769368, '0966856896',
       'Sân bóng La Khê - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'VPBank', '303347063111', 'CHU SAN HA DONG', '06:30', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng La Khê')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 7 - 1', 'F7'), ('Sân 7 - 2', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 290000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 420000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 460000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 510000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 740000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 810000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Văn Phú', 'Ngõ 20 Vạn Phúc, Phúc La, Hà Đông', 'HN_HD', 20.972765, 105.782599, '0966026286',
       'Sân bóng Văn Phú - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '897411084512', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Văn Phú')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 260000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 380000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 420000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 450000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 650000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 720000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Mộ Lao', 'Tổ 16 Mộ Lao, Hà Đông', 'HN_HD', 20.977915, 105.782788, '0963088986',
       'Sân bóng Mộ Lao - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'MB Bank', '969575381613', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Mộ Lao')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 5 - C', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('WIFI'), ('LOCKER')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 300000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 440000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 480000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 560000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 810000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 890000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;

INSERT INTO venue (owner_id, name, address, district_code, latitude, longitude, phone, description,
                   status, deposit_rate, bank_name, bank_account, bank_holder, open_time, close_time)
SELECT id, 'Sân bóng Minh Kiệt Dương Nội', 'Trường VIS, gần Aeon Mall Hà Đông, Dương Nội, Hà Đông', 'HN_HD', 20.975647, 105.771163, '0904458863',
       'Sân bóng Minh Kiệt Dương Nội - sân cỏ nhân tạo tại Hà Đông, có đèn chiếu sáng buổi tối, phù hợp đá giao hữu và thuê theo giờ.',
       'APPROVED', 0.300, 'Vietcombank', '432752731514', 'CHU SAN HA DONG', '06:00', '23:59'
  FROM app_user WHERE lower(email) = 'hadong@gmail.com';
WITH v AS (SELECT v.id FROM venue v JOIN app_user u ON u.id = v.owner_id WHERE lower(u.email) = 'hadong@gmail.com' AND v.name = 'Sân bóng Minh Kiệt Dương Nội')
, f AS (INSERT INTO field (venue_id, name, type) SELECT v.id, x.name, x.type::field_type FROM v,
        (VALUES ('Sân 5 - A', 'F5'), ('Sân 5 - B', 'F5'), ('Sân 7 - 1', 'F7')) AS x(name, type) RETURNING 1)
, a AS (INSERT INTO venue_amenity (venue_id, amenity_code) SELECT v.id, x.c FROM v,
        (VALUES ('LIGHT'), ('PARKING'), ('CANTEEN'), ('REFEREE')) AS x(c) RETURNING 1)
, p AS (INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, label) SELECT v.id,
        x.ft::field_type, x.dt::day_type, int4range(x.s, x.e), x.price, x.label FROM v, (VALUES
          ('F5', 'WEEKDAY', 360, 960, 280000, 'Giờ thường'),
          ('F5', 'WEEKDAY', 960, 1440, 410000, 'Giờ vàng'),
          ('F5', 'WEEKEND', 360, 1440, 450000, 'Cuối tuần'),
          ('F7', 'WEEKDAY', 360, 960, 550000, 'Giờ thường'),
          ('F7', 'WEEKDAY', 960, 1440, 800000, 'Giờ vàng'),
          ('F7', 'WEEKEND', 360, 1440, 880000, 'Cuối tuần')
        ) AS x(ft, dt, s, e, price, label) RETURNING 1)
, c AS (INSERT INTO cancellation_policy (venue_id, hours_before, refund_percent) SELECT v.id, x.h, x.r FROM v,
        (VALUES (24, 100), (6, 50), (0, 0)) AS x(h, r) RETURNING 1)
, s AS (INSERT INTO venue_service (venue_id, name, price) SELECT v.id, x.n, x.p FROM v,
        (VALUES ('2 thùng nước suối ướp lạnh', 60000), ('Thuê 2 bộ áo bib', 40000),
                ('Bóng thi đấu tiêu chuẩn', 30000), ('Thuê trọng tài', 200000)) AS x(n, p) RETURNING 1)
INSERT INTO venue_approval (venue_id, admin_id, action) SELECT v.id, (SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY id LIMIT 1), 'APPROVE' FROM v;
