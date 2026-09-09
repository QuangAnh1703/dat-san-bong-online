'use strict';
const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Kiem tra suc khoe + ket noi CSDL
router.get('/health', async (_req, res) => {
  try {
    const r = await query(
      `SELECT current_database() AS db, current_user AS "user",
              (SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
              now() AS server_time`);
    res.json({ status: 'ok', ...r.rows[0] });
  } catch (err) {
    res.status(503).json({ status: 'db_down', error: err.message });
  }
});

// Danh muc endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'API dat san bong da',
    version: '1.0.0',
    endpoints: [
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

router.use('/api/venues', require('./venues'));
router.use('/api/fields', require('./fields'));
router.use('/api/bookings', require('./bookings'));

module.exports = router;
