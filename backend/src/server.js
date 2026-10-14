'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');

const { waitForDb, pool } = require('./db');
const { validate: validateSchema } = require('./db/migrate');
const { connect: connectRedis } = require('./redis');
const { initializeEmail } = require('./services/email.service');
const { requestId, requestLogger, notFound, errorHandler } = require('./middlewares');
const { verifyAccessToken, requireAuthenticated } = require('./middlewares/auth');
const { checkPermission } = require('./middlewares/rbac');
const routes = require('./routes');
const { expireFreelance } = require('./modules/community/freelance.repository');

const app = express();

// Frontend chay o cong khac (Vite: 5173) -> phai bat CORS
const ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json());
app.use(passport.initialize());
app.use(requestId);
app.use(requestLogger);
app.use(verifyAccessToken);
app.use(checkPermission());

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 3000);

(async () => {
  await waitForDb();
  try {
    await connectRedis();
  } catch (err) {
    console.warn('[redis] warning: %s (continue without Redis)', err.message);
  }
  try {
    await initializeEmail();
  } catch (err) {
    console.error('[email] error: %s', err.message);
    console.error('[email] check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    process.exit(1);
  }
  try {
    await validateSchema();
  } catch (err) {
    console.error('[migrate] schema khong khop migration: %s', err.message);
    console.error('[migrate] chay "npm run migrate" roi khoi dong lai server');
    process.exit(1);
  }
  const server = app.listen(PORT, () => {
    console.log('API chay tai http://localhost:%d', PORT);
    console.log('Cho phep goi tu: %s', ORIGINS.join(', '));
  });
  const shutdown = () => {
    console.log('Dang dong...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  // Nha cac don HELD qua han giu cho (khong co job nay slot bi chiem vinh vien)
  const releaseTimer = setInterval(async () => {
    try {
      const r = await pool.query('SELECT fn_release_expired_holds() AS released');
      await pool.query(
        `UPDATE match_post mp SET status = 'CLOSED', closed_at = now()
           FROM booking b
          WHERE b.id = mp.booking_id AND mp.status = 'OPEN'
            AND b.status::text LIKE 'CANCELLED%'`
      );
      await expireFreelance(pool);
      if (r.rows[0].released > 0) console.log('[hold] nha %d slot qua han', r.rows[0].released);
    } catch (err) {
      console.error('[hold] loi khi nha slot qua han: %s', err.message);
    }
  }, 60 * 1000);
  releaseTimer.unref();

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
