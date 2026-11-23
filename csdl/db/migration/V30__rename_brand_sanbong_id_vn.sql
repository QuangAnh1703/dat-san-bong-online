-- =====================================================================
-- V30: Đổi tên thương hiệu SanBong.vn -> SanBong.id.vn (tên miền đã deploy)
-- trong kho tri thức trợ lý (seed V29). search_vector là cột GENERATED nên tự tính lại.
-- =====================================================================

UPDATE kb_article
SET title      = replace(title, 'SanBong.vn', 'SanBong.id.vn'),
    content    = replace(content, 'SanBong.vn', 'SanBong.id.vn'),
    updated_at = now()
WHERE title LIKE '%SanBong.vn%' OR content LIKE '%SanBong.vn%';
