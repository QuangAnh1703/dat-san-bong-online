'use strict';
const express = require('express');
const path = require('path');
const { query } = require('../db');
const { AppError } = require('../lib/errors');

const router = express.Router();

// Kiem tra suc khoe + ket noi CSDL
router.get('/health', async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT current_database() AS db, current_user AS "user",
              (SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
              now() AS server_time`);
    res.json({ status: 'ok', ...r.rows[0] });
  } catch (err) {
    next(new AppError('DB_UNAVAILABLE', { cause: err }));
  }
});

// Danh muc endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'API dat san bong da',
    version: '1.0.0',
    endpoints: [
      'GET  /docs   (tai lieu API)',
      'GET  /openapi.yaml',
      'GET  /health',
      'GET  /api/districts',
      'GET  /api/venues?district=&q=',
      'GET  /api/venues/:id',
      'GET  /api/venues/:id/revenue',
      'GET  /api/fields/:id/schedule?date=YYYY-MM-DD',
      'GET  /api/fields/:id/availability?date=&start=HH:MM&end=HH:MM',
      'POST /api/bookings',
      'GET  /api/bookings/:code',
      'POST /api/bookings/:code/cancel',
      'POST /api/bookings/maintenance/release-expired',
    ],
  });
});

router.get('/api/districts', async (_req, res, next) => {
  try {
    const r = await query(`SELECT code, name FROM district ORDER BY name`);
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) { next(e); }
});

// --- Tai lieu API ---
const SPEC_FILE = path.join(__dirname, '..', '..', '..', 'docs', 'openapi.yaml');

// File dac ta tho, dung cho Postman / Insomnia / sinh code client
router.get('/openapi.yaml', (_req, res) => {
  res.type('text/yaml').sendFile(SPEC_FILE);
});

// Trang doc tai lieu cho nguoi
router.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Tai lieu API - Dat san bong da</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#ui', docExpansion: 'list' });
  </script>
</body>
</html>`);
});

router.use('/api/auth', require('../modules/auth/auth.routes'));
router.use('/api/venues', require('../modules/venues/venues.routes'));
router.use('/api/fields', require('../modules/venues/fields.routes'));
router.use('/api/bookings', require('../modules/bookings/bookings.routes'));
router.use('/api/payments', require('../modules/payments/payments.routes'));
router.use('/api/community', require('../modules/community/community.routes'));

module.exports = router;
