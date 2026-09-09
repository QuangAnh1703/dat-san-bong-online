'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { waitForDb, pool } = require('./db');
const { requestLogger, notFound, errorHandler } = require('./middlewares');
const routes = require('./routes');

const app = express();

// Frontend chay o cong khac (Vite: 5173) -> phai bat CORS
const ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json());
app.use(requestLogger);

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 3000);

(async () => {
  await waitForDb();
  const server = app.listen(PORT, () => {
    console.log('API chay tai http://localhost:%d', PORT);
    console.log('Cho phep goi tu: %s', ORIGINS.join(', '));
  });
  const shutdown = () => {
    console.log('Dang dong...');
    server.close(async () => { await pool.end(); process.exit(0); });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
