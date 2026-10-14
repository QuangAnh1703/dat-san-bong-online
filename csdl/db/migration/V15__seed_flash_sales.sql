-- =====================================================================
-- V15 — Bật Flash Sale ("Kèo gấp giá hời") cho khoảng 1/3 cụm sân seed ở V14
-- Slot còn trống cách giờ đá <= 3 giờ được giảm 20/25/30%, không xuống dưới giá sàn.
-- =====================================================================

INSERT INTO promotion (venue_id, type, name, discount_percent, trigger_hours_before, floor_price, is_active)
SELECT v.id, 'FLASH_SALE', 'Kèo gấp giá hời',
       (ARRAY[20, 25, 30])[1 + (v.rn / 3) % 3],
       3,
       (SELECT round(min(pr.base_price * pr.multiplier) * 0.6, -4) FROM price_rule pr WHERE pr.venue_id = v.id),
       TRUE
  FROM (SELECT v.id, (row_number() OVER (ORDER BY v.id))::int AS rn
          FROM venue v
          JOIN app_user u ON u.id = v.owner_id
         WHERE u.role = 'OWNER' AND u.email LIKE '%@gmail.com') v
 WHERE v.rn % 3 = 0
   AND NOT EXISTS (SELECT 1 FROM promotion p WHERE p.venue_id = v.id AND p.type = 'FLASH_SALE');
