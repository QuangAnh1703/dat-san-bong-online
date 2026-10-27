-- Bảng mới ở V17 do user chạy migration sở hữu -> cấp quyền cho user của ứng dụng (nếu có)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sanbong') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON complaint_message TO sanbong;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sanbong;
    END IF;
END $$;
