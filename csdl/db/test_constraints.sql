-- =====================================================================
-- Kịch bản kiểm thử ràng buộc — chạy sau khi đã nạp V1..V10
-- Cách chạy:  psql -d sanbong -f db/test_constraints.sql
-- Mỗi khối tự bắt lỗi và in ra KẾT QUẢ ĐẠT / KHÔNG ĐẠT.
-- =====================================================================
\set ON_ERROR_STOP off

-- TC-01: Không được đặt trùng khung giờ trên cùng một sân con -----------
DO $$
DECLARE v_date DATE := CURRENT_DATE + 1;
BEGIN
    INSERT INTO booking (code, kind, status, venue_id, user_id, total_amount, deposit_amount, hold_expires_at)
    VALUES ('TC01', 'SINGLE', 'HELD', 1, 3, 450000, 135000, now() + INTERVAL '5 min');

    -- Sân 7A ngày mai 19:30–21:00 đã có đơn BK...A17 ở trạng thái CONFIRMED,
    -- ô giờ dưới đây (20:00–21:30) giao với nó.
    INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
    VALUES ((SELECT id FROM booking WHERE code = 'TC01'), 1, v_date,
            tstzrange(v_date + TIME '20:00', v_date + TIME '21:30', '[)'), 450000, 'HELD');

    RAISE NOTICE 'TC-01 KHONG DAT: he thong da cho phep dat trung!';
EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE 'TC-01 DAT: CSDL tu choi dat trung (SQLSTATE 23P01)';
END $$;

-- TC-02: Cho phép đặt sát nhau nhưng không giao (21:00–22:30) -----------
DO $$
DECLARE v_date DATE := CURRENT_DATE + 1; v_bid BIGINT;
BEGIN
    INSERT INTO booking (code, kind, status, venue_id, user_id, total_amount, deposit_amount, hold_expires_at)
    VALUES ('TC02', 'SINGLE', 'HELD', 1, 3, 450000, 135000, now() + INTERVAL '5 min')
    RETURNING id INTO v_bid;

    INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
    VALUES (v_bid, 1, v_date,
            tstzrange(v_date + TIME '21:00', v_date + TIME '22:30', '[)'), 250000, 'HELD');

    RAISE NOTICE 'TC-02 DAT: dat duoc khung gio ke tiep khong giao nhau';
    DELETE FROM booking WHERE id = v_bid;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TC-02 KHONG DAT: %', SQLERRM;
END $$;

-- TC-03: Không được cấu hình hai khung giờ giá chồng lấp ----------------
DO $$
BEGIN
    -- Khung 17:00–19:00 đã tồn tại (1020–1260); thêm 18:00–20:00 sẽ đè lên
    INSERT INTO price_rule (venue_id, field_type, day_type, time_span, base_price, multiplier, label)
    VALUES (1, 'F7', 'WEEKDAY', int4range(1080, 1200), 320000, 1.20, 'Khung sai');
    RAISE NOTICE 'TC-03 KHONG DAT: he thong da cho phep khung gia chong lap!';
EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE 'TC-03 DAT: CSDL tu choi khung gia chong lap';
END $$;

-- TC-04: Số điện thoại sai định dạng bị từ chối -------------------------
DO $$
BEGIN
    INSERT INTO app_user (phone, password_hash, role) VALUES ('12345', 'x', 'PLAYER');
    RAISE NOTICE 'TC-04 KHONG DAT: SDT sai dinh dang van duoc luu!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TC-04 DAT: SDT phai co dung 10 chu so bat dau bang 0';
END $$;

-- TC-05: Tuyển quá 10 chân lẻ bị từ chối --------------------------------
DO $$
BEGIN
    INSERT INTO match_post (type, status, booking_id, author_user_id, team_id,
                            play_date, required_level, slots_needed, cost_kind, expires_at)
    VALUES ('TEAM_FINDS_PLAYER', 'OPEN', 1, 1, 1, CURRENT_DATE + 1,
            'GOOD', 15, 'FREE', now() + INTERVAL '1 day');
    RAISE NOTICE 'TC-05 KHONG DAT: tuyen duoc hon 10 nguoi!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TC-05 DAT: toi da 10 nguoi/bai dang';
END $$;

-- TC-06: Một đơn chỉ được đánh giá một lần ------------------------------
INSERT INTO review (booking_id, venue_id, user_id, pitch_rating, service_rating)
VALUES (1, 1, 1, 4, 5);

DO $$
BEGIN
    INSERT INTO review (booking_id, venue_id, user_id, pitch_rating, service_rating)
    VALUES (1, 1, 1, 5, 5);
    RAISE NOTICE 'TC-06 KHONG DAT: danh gia duoc hai lan!';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TC-06 DAT: moi don chi danh gia mot lan';
END $$;

-- TC-07: IPN gọi lại lần hai không được ghi trùng (idempotency) ---------
DO $$
BEGIN
    INSERT INTO payment_transaction (payment_id, type, amount, provider, provider_txn_no,
                                     response_code, signature_valid, raw_payload)
    VALUES (1, 'DEPOSIT', 135000, 'VNPAY', '14237891', '00', TRUE, '{}'::jsonb);
    RAISE NOTICE 'TC-07 KHONG DAT: IPN trung duoc ghi hai lan!';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TC-07 DAT: IPN trung bi tu choi (idempotent)';
END $$;

-- TC-08: Hàm kiểm tra slot trống ----------------------------------------
DO $$
DECLARE v_date DATE := CURRENT_DATE + 1; v_busy BOOLEAN; v_free BOOLEAN; v_past BOOLEAN;
BEGIN
    v_busy := fn_is_slot_available(1, tstzrange(v_date + TIME '19:30', v_date + TIME '21:00'));
    v_free := fn_is_slot_available(1, tstzrange(v_date + TIME '21:00', v_date + TIME '22:30'));
    v_past := fn_is_slot_available(1, tstzrange(CURRENT_DATE - 1 + TIME '19:00',
                                                CURRENT_DATE - 1 + TIME '20:30'));
    IF v_busy = FALSE AND v_free = TRUE AND v_past = FALSE THEN
        RAISE NOTICE 'TC-08 DAT: ham fn_is_slot_available tra ve dung (ban=%, trong=%, qua khu=%)',
            v_busy, v_free, v_past;
    ELSE
        RAISE NOTICE 'TC-08 KHONG DAT: ban=%, trong=%, qua khu=%', v_busy, v_free, v_past;
    END IF;
END $$;

-- TC-09: Job nhả đơn quá hạn giữ chỗ ------------------------------------
DO $$
DECLARE v_bid BIGINT; v_released INTEGER; v_status booking_status;
BEGIN
    INSERT INTO booking (code, kind, status, venue_id, user_id, total_amount, deposit_amount, hold_expires_at)
    VALUES ('TC09', 'SINGLE', 'HELD', 1, 3, 200000, 60000, now() - INTERVAL '1 min')
    RETURNING id INTO v_bid;

    INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
    VALUES (v_bid, 2, CURRENT_DATE + 1,
            tstzrange(CURRENT_DATE + 1 + TIME '08:00', CURRENT_DATE + 1 + TIME '09:30', '[)'),
            200000, 'HELD');

    v_released := fn_release_expired_holds();
    SELECT status INTO v_status FROM booking WHERE id = v_bid;

    IF v_status = 'CANCELLED_EXPIRED' THEN
        RAISE NOTICE 'TC-09 DAT: don qua han da tu chuyen sang CANCELLED_EXPIRED (% slot duoc nha)', v_released;
    ELSE
        RAISE NOTICE 'TC-09 KHONG DAT: trang thai hien tai = %', v_status;
    END IF;
    DELETE FROM booking WHERE id = v_bid;
END $$;

-- TC-10: Trigger cập nhật điểm đánh giá trung bình của cụm sân ----------
DO $$
DECLARE v_avg NUMERIC; v_cnt INTEGER;
BEGIN
    SELECT avg_rating, rating_count INTO v_avg, v_cnt FROM venue WHERE id = 1;
    IF v_cnt >= 1 THEN
        RAISE NOTICE 'TC-10 DAT: venue #1 co avg_rating=% tu % danh gia', v_avg, v_cnt;
    ELSE
        RAISE NOTICE 'TC-10 KHONG DAT: trigger chua cap nhat rating';
    END IF;
END $$;

-- TC-11: Hàm trừ điểm uy tín khi bùng kèo ------------------------------
DO $$
DECLARE v_new SMALLINT;
BEGIN
    v_new := fn_apply_reputation(2, (-5)::SMALLINT, 'Bung keo truoc gio da 45 phut', 'BOOKING', 1);
    RAISE NOTICE 'TC-11 DAT: diem uy tin nguoi dung #2 con %', v_new;
END $$;

-- Kiểm tra hai view -----------------------------------------------------
\echo '--- v_field_schedule (lich san) ---'
SELECT field_name, play_date, start_at::time AS bat_dau, end_at::time AS ket_thuc,
       slot_status, customer_name
  FROM v_field_schedule WHERE venue_id = 1 ORDER BY play_date, start_at;

\echo '--- v_venue_daily_revenue (doanh thu theo ngay) ---'
SELECT * FROM v_venue_daily_revenue ORDER BY venue_id, play_date;
