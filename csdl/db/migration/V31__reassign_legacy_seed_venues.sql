-- =====================================================================
-- V31: Chuyển các cụm sân seed cũ ở V10 (chủ sân demo owner1/owner2@example.com,
-- mật khẩu giả nên không đăng nhập được) sang chủ sân theo quận seed ở V14
-- (<quận>@gmail.com). Trước đây người chơi tìm theo quận thấy cả các sân này,
-- còn chủ sân của quận đó đăng nhập thì không thấy -> danh sách lệch nhau.
-- Chỉ đổi owner_id, đơn đặt / lịch sử của sân giữ nguyên.
-- =====================================================================

WITH district_owner AS (
  SELECT DISTINCT ON (p.district_code) p.district_code, u.id AS owner_id
    FROM app_user u
    JOIN user_profile p ON p.user_id = u.id
   WHERE u.role = 'OWNER'
     AND lower(u.email) LIKE '%@gmail.com'
     AND p.full_name LIKE 'Chủ sân %'
   ORDER BY p.district_code, u.id
)
UPDATE venue v
   SET owner_id = d.owner_id,
       updated_at = now()
  FROM district_owner d, app_user old
 WHERE d.district_code = v.district_code
   AND old.id = v.owner_id
   AND lower(old.email) IN ('owner1@example.com', 'owner2@example.com');
