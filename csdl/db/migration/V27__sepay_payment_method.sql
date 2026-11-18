-- =====================================================================
-- V27 — Cổng thanh toán SePay (checkout: thẻ / chuyển khoản / NAPAS) cho tiền cọc
-- =====================================================================

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'SEPAY';
