'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');

const { waitForDb, pool, withTransaction } = require('./db');
const { validate: validateSchema } = require('./db/migrate');
const { connect: connectRedis } = require('./redis');
const { initializeEmail } = require('./services/email.service');
const { requestId, requestLogger, notFound, errorHandler } = require('./middlewares');
const { verifyAccessToken, requireAuthenticated } = require('./middlewares/auth');
const { checkPermission } = require('./middlewares/rbac');
const routes = require('./routes');
const { expireFreelance } = require('./modules/community/freelance.repository');
const { restockCancelled } = require('./services/inventory.service');
const { remindOverdue } = require('./services/split.service');
const { refundCancelledWalletPayments } = require('./services/wallet.service');
const { remindMatchResults } = require('./services/tournament.service');

// Don da xac nhan va moi khung gio da qua -> COMPLETED, cong so tran cho nguoi dat va nguoi tham gia
async function completeFinishedBookings(db) {
  await db.query(
    `WITH done AS (
       UPDATE booking b SET status = 'COMPLETED'
        WHERE b.status IN ('CONFIRMED', 'IN_PROGRESS') AND b.kind <> 'OWNER_LOCK'
          AND EXISTS (SELECT 1 FROM booking_slot s WHERE s.booking_id = b.id AND s.status <> 'RELEASED')
          AND NOT EXISTS (SELECT 1 FROM booking_slot s
                           WHERE s.booking_id = b.id AND s.status <> 'RELEASED' AND upper(s.time_range) > now())
       RETURNING b.id, b.user_id
     ), players AS (
       SELECT user_id FROM done
       UNION ALL
       SELECT mp.user_id FROM match_participant mp JOIN done ON done.id = mp.booking_id
        WHERE mp.cancelled_at IS NULL AND mp.user_id <> done.user_id
     )
     UPDATE user_profile up SET total_matches = up.total_matches + x.n
       FROM (SELECT user_id, count(*) AS n FROM players GROUP BY user_id) x
      WHERE up.user_id = x.user_id`
  );
}

const app = express();
// Sau proxy cua Render/Vercel: req.ip lay IP that cua khach (dung cho gioi han tan suat chatbot)
app.set('trust proxy', 1);

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
    // Khong tat server: chi cac chuc nang gui mail (OTP email, xuat bao cao) bi anh huong
    console.error('[email] error: %s', err.message);
    console.error('[email] check BREVO_API_KEY/EMAIL_FROM hoac GMAIL_USER/GMAIL_APP_PASSWORD in .env');
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
      await withTransaction(restockCancelled);
      await withTransaction(remindOverdue);
      await withTransaction(refundCancelledWalletPayments);
      await withTransaction(remindMatchResults);
      await completeFinishedBookings(pool);
      if (r.rows[0].released > 0) console.log('[hold] nha %d slot qua han', r.rows[0].released);
    } catch (err) {
      console.error('[hold] loi khi nha slot qua han: %s', err.message);
    }
  }, 60 * 1000);
  releaseTimer.unref();

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
