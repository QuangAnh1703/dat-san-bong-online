'use strict';
require('dotenv').config();
const express = require('express');
const { query, waitForDb, pool } = require('./db');

const path = require('path');

const app = express();
app.use(express.json());

// Phuc vu giao dien web tinh trong thu muc /web (cung goc voi API)
const WEB_DIR = path.join(__dirname, '..', '..', 'web');
app.use(express.static(WEB_DIR));

// Log gon moi request
app.use((req, _res, next) => {
  console.log('%s %s', req.method, req.originalUrl);
  next();
});

// Kiem tra suc khoe + ket noi CSDL
app.get('/health', async (_req, res) => {
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

app.get('/api', (_req, res) => {
  res.json({
    name: 'API dat san bong da',
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

app.get('/api/districts', async (_req, res, next) => {
  try {
    const r = await query(`SELECT code, name FROM district ORDER BY name`);
    res.json({ count: r.rowCount, data: r.rows });
  } catch (e) { next(e); }
});

app.use('/api/venues', require('./routes/venues'));
app.use('/api/fields', require('./routes/fields'));
app.use('/api/bookings', require('./routes/bookings'));

app.use((_req, res) => res.status(404).json({ error: 'Khong co endpoint nay' }));

// Bo bat loi chung
app.use((err, _req, res, _next) => {
  console.error('[loi]', err.code || '', err.message);
  res.status(500).json({ error: 'Loi may chu', code: err.code, detail: err.message });
});

const PORT = Number(process.env.PORT || 3000);

(async () => {
  await waitForDb();
  const server = app.listen(PORT, () => console.log('API chay tai http://localhost:%d', PORT));
  const shutdown = async () => {
    console.log('Dang dong...');
    server.close(async () => { await pool.end(); process.exit(0); });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
