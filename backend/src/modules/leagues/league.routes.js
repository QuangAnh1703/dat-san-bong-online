'use strict';
const express = require('express');
const { query, withTransaction } = require('../../db');
const { AppError, requireFields } = require('../../lib/errors');
const { requireAuthenticated } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const league = require('../../services/tournament.service');

// Elo, bang xep hang & giai dau (PRD 2.1.9). Gan tai /api.
const router = express.Router();

// Tieu chi chinh giam dan; bang diem thi xet tiep Elo, so tran thang, ten doi
const SORTS = {
  elo: 't.elo DESC, t.wins DESC',
  wins: 't.wins DESC, t.elo DESC',
  streak: 't.win_streak DESC, t.wins DESC, t.elo DESC',
  reputation: 't.reputation_score DESC, t.elo DESC',
};

// GET /api/leaderboard?district=&sort=elo|wins|streak|reputation
router.get('/leaderboard', async (req, res, next) => {
  try {
    const sort = SORTS[req.query.sort] ? req.query.sort : 'elo';
    const r = await query(
      `SELECT t.id, t.name, t.logo_url, t.skill_level, t.elo, t.wins, t.draws, t.losses, t.win_streak,
              t.reputation_score, t.district_code, d.name AS district_name,
              (t.wins + t.draws + t.losses) AS played
         FROM team t LEFT JOIN district d ON d.code = t.district_code
        WHERE ($1::text IS NULL OR t.district_code = $1)
        ORDER BY ${SORTS[sort]}, t.name, t.id
        LIMIT 100`,
      [req.query.district || null]
    );
    res.json({ count: r.rowCount, sort, data: r.rows.map((x, i) => ({ rank: i + 1, ...x })) });
  } catch (err) {
    next(err);
  }
});

// GET /api/matches/results/mine - tran cap keo cua doi minh (cho chu san nhap / da chot ty so)
router.get('/matches/results/mine', requireAuthenticated, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT b.code, v.name AS venue_name,
              (SELECT min(lower(s.time_range)) FROM booking_slot s WHERE s.booking_id = b.id) AS starts_at,
              (SELECT max(upper(s.time_range)) FROM booking_slot s WHERE s.booking_id = b.id) AS ends_at,
              ht.id AS home_team_id, ht.name AS home_name, at.id AS away_team_id, at.name AS away_name,
              CASE WHEN ht.captain_id = $1 THEN 'home' ELSE 'away' END AS my_side,
              mr.status, mr.home_claim_home, mr.home_claim_away, mr.away_claim_home, mr.away_claim_away,
              mr.dispute_due_at, mr.home_elo_delta, mr.away_elo_delta,
              mp.loser_percent, mp.deal_note, mr.total_amount, mr.home_amount, mr.away_amount
         FROM booking b
         JOIN venue v ON v.id = b.venue_id
         JOIN match_post mp ON mp.booking_id = b.id AND mp.type = 'TEAM_FINDS_TEAM' AND mp.status = 'MATCHED'
         JOIN team ht ON ht.id = mp.team_id
         JOIN join_request jr ON jr.post_id = mp.id AND jr.status = 'ACCEPTED' AND jr.requester_team_id IS NOT NULL
         JOIN team at ON at.id = jr.requester_team_id
         LEFT JOIN match_result mr ON mr.booking_id = b.id
        WHERE (ht.captain_id = $1 OR at.captain_id = $1)
          AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
        ORDER BY starts_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

const score = (v, field) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new AppError('INVALID_FIELD', { details: { field } });
  return n;
};

// GET /api/matches/results/pending - tran cap keo da da xong tai san cua chu san, chua nhap ty so
router.get('/matches/results/pending', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = await withTransaction((c) => league.listOwnerPendingResults(c, req.user));
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:code/result  body: { home_score, away_score } - chu san nhap ty so, chot ngay
router.post('/matches/:code/result', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    requireFields(req.body, ['home_score', 'away_score']);
    const h = score(req.body.home_score, 'home_score');
    const a = score(req.body.away_score, 'away_score');
    res.json(await withTransaction((c) => league.recordResult(c, req.params.code, req.user, h, a)));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------- Giai dau

const T_COLS = `t.id, t.venue_id, v.name AS venue_name, d.name AS district_name, t.field_id, f.name AS field_name, f.type AS field_type,
  t.organizer_id, t.name, t.description, t.format, t.max_teams, t.fee, t.registration_deadline, t.start_date::text AS start_date,
  t.daily_start_minute, t.daily_end_minute, t.match_minutes, t.status, t.created_at,
  (SELECT count(*) FROM tournament_team tt WHERE tt.tournament_id = t.id AND tt.status = 'REGISTERED')::int AS registered`;
const T_FROM = `FROM tournament t JOIN venue v ON v.id = t.venue_id JOIN field f ON f.id = t.field_id
  LEFT JOIN district d ON d.code = v.district_code`;

// GET /api/tournaments?status=OPEN,ONGOING&mine=1
router.get('/tournaments', async (req, res, next) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(',') : null;
    const mine = req.query.mine && req.user ? req.user.id : null;
    const r = await query(
      `SELECT ${T_COLS} ${T_FROM}
        WHERE ($1::text[] IS NULL OR t.status = ANY($1)) AND ($2::bigint IS NULL OR t.organizer_id = $2)
        ORDER BY t.status = 'OPEN' DESC, t.start_date DESC LIMIT 100`,
      [statuses, mine]
    );
    res.json({ count: r.rowCount, data: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/tournaments/:id - thong tin, doi, lich, bang xep hang, dang ky cua doi minh
router.get('/tournaments/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const t = await query(`SELECT ${T_COLS}, v.bank_name, v.bank_account, v.bank_holder ${T_FROM} WHERE t.id = $1`, [id]);
    if (t.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy giải đấu' });
    const [teams, matches] = await Promise.all([
      query(
        `SELECT tt.team_id, tm.name, tm.elo, tm.reputation_score, tt.status, tt.group_label, tt.paid_at
           FROM tournament_team tt JOIN team tm ON tm.id = tt.team_id
          WHERE tt.tournament_id = $1 ORDER BY tt.status, tt.group_label NULLS FIRST, tm.name`,
        [id]
      ),
      query(
        `SELECT m.id, m.round, m.group_label, m.home_team_id, h.name AS home_name, m.away_team_id, a.name AS away_name,
                m.starts_at, m.home_score, m.away_score, m.status, m.forfeit_team_id
           FROM tournament_match m LEFT JOIN team h ON h.id = m.home_team_id LEFT JOIN team a ON a.id = m.away_team_id
          WHERE m.tournament_id = $1 ORDER BY m.round, m.starts_at NULLS LAST, m.id`,
        [id]
      ),
    ]);
    let my = null;
    if (req.user) {
      const myTeam = await query(`SELECT id, name, tournament_banned_until FROM team WHERE captain_id = $1`, [req.user.id]);
      if (myTeam.rows[0]) {
        const reg = await query(`SELECT status, fee_code FROM tournament_team WHERE tournament_id = $1 AND team_id = $2`, [
          id,
          myTeam.rows[0].id,
        ]);
        my = { team: myTeam.rows[0], registration: reg.rows[0] || null };
      }
    }
    const tour = t.rows[0];
    const registered = teams.rows.filter((x) => x.status === 'REGISTERED');
    res.json({
      ...tour,
      is_organizer: !!req.user && (req.user.id === tour.organizer_id || req.user.role === 'ADMIN'),
      teams: teams.rows,
      matches: matches.rows,
      standings: tour.format === 'ROUND_ROBIN' ? league.standings(registered, matches.rows) : null,
      my,
    });
  } catch (err) {
    next(err);
  }
});

const toMinute = (v, field) => {
  const m = String(v || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 24 || Number(m[2]) > 59) throw new AppError('INVALID_FIELD', { details: { field } });
  return Number(m[1]) * 60 + Number(m[2]);
};

// POST /api/tournaments (chu san / BTC)
// body: { venue_id, field_id, name, description?, format, max_teams, fee, registration_deadline, start_date,
//         daily_start: 'HH:MM', daily_end: 'HH:MM', match_minutes }
router.post('/tournaments', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    requireFields(b, ['venue_id', 'field_id', 'name', 'format', 'max_teams', 'registration_deadline', 'start_date', 'daily_start', 'daily_end']);
    if (!['ROUND_ROBIN', 'KNOCKOUT'].includes(b.format)) throw new AppError('INVALID_FIELD', { details: { field: 'format' } });
    const deadline = new Date(b.registration_deadline);
    if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
      throw new AppError('INVALID_FIELD', { message: 'Hạn đăng ký phải ở tương lai', details: { field: 'registration_deadline' } });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.start_date)) || new Date(`${b.start_date}T23:59:59`) < deadline) {
      throw new AppError('INVALID_FIELD', { message: 'Ngày khai mạc phải sau hạn đăng ký', details: { field: 'start_date' } });
    }
    const out = await withTransaction(async (c) => {
      const f = await c.query(
        `SELECT f.id, f.venue_id, v.owner_id, v.status FROM field f JOIN venue v ON v.id = f.venue_id WHERE f.id = $1 AND f.is_active`,
        [Number(b.field_id)]
      );
      const field = f.rows[0];
      if (!field || Number(field.venue_id) !== Number(b.venue_id)) throw new AppError('FIELD_NOT_FOUND');
      if (req.user.role !== 'ADMIN' && field.owner_id !== req.user.id) throw new AppError('FORBIDDEN');
      if (field.status !== 'APPROVED') throw new AppError('VENUE_NOT_APPROVED');
      const r = await c.query(
        `INSERT INTO tournament (venue_id, field_id, organizer_id, name, description, format, max_teams, fee,
                                 registration_deadline, start_date, daily_start_minute, daily_end_minute, match_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [
          field.venue_id,
          field.id,
          req.user.id,
          String(b.name).trim().slice(0, 120),
          b.description ? String(b.description).slice(0, 1000) : null,
          b.format,
          Number(b.max_teams),
          Math.round(Number(b.fee) || 0),
          deadline,
          b.start_date,
          toMinute(b.daily_start, 'daily_start'),
          toMinute(b.daily_end, 'daily_end'),
          Number(b.match_minutes) || 60,
        ]
      );
      return { id: r.rows[0].id };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/register - doi truong dang ky; giai co le phi -> PENDING_PAYMENT cho thu le phi
router.post('/tournaments/:id/register', requireAuthenticated, async (req, res, next) => {
  try {
    const out = await withTransaction(async (c) => {
      const t = await c.query(
        `SELECT t.* FROM tournament t WHERE t.id = $1 FOR UPDATE`,
        [Number(req.params.id)]
      );
      const tour = t.rows[0];
      if (!tour) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy giải đấu' });
      if (tour.status !== 'OPEN' || new Date(tour.registration_deadline) <= new Date()) {
        throw new AppError('INVALID_STATUS', { message: 'Giải đã đóng đăng ký' });
      }
      const team = (await c.query(`SELECT * FROM team WHERE captain_id = $1`, [req.user.id])).rows[0];
      if (!team) throw new AppError('TEAM_REQUIRED');
      if (team.tournament_banned_until && new Date(team.tournament_banned_until) > new Date()) {
        throw new AppError('TOURNAMENT_BANNED', {
          message: `Đội của bạn đang bị cấm đăng ký giải đến ${new Date(team.tournament_banned_until).toLocaleDateString('vi-VN')}`,
        });
      }
      if ((await league.registeredCount(c, tour.id)) >= tour.max_teams) throw new AppError('TOURNAMENT_FULL');
      const free = Number(tour.fee) === 0;
      const ins = await c.query(
        `INSERT INTO tournament_team (tournament_id, team_id, fee_code, status, paid_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tournament_id, team_id) DO UPDATE
           SET status = CASE WHEN tournament_team.status = 'WITHDRAWN' THEN EXCLUDED.status ELSE tournament_team.status END
         RETURNING status, fee_code`,
        [tour.id, team.id, league.makeFeeCode(), free ? 'REGISTERED' : 'PENDING_PAYMENT', free ? new Date() : null]
      );
      const reg = ins.rows[0];
      return {
        status: reg.status,
        fee_code: reg.fee_code,
      };
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/schedule - BTC chia bang & xep lich (loai truc tiep: goi lai de xep vong sau)
router.post('/tournaments/:id/schedule', requireAuthenticated, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    res.json(await withTransaction((c) => league.schedule(c, Number(req.params.id), req.user)));
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/matches/:id/result  body: { home_score, away_score } (BTC)
router.post('/tournaments/matches/:id/result', requireAuthenticated, async (req, res, next) => {
  try {
    requireFields(req.body, ['home_score', 'away_score']);
    const h = score(req.body.home_score, 'home_score');
    const a = score(req.body.away_score, 'away_score');
    res.json(await withTransaction((c) => league.recordMatchResult(c, Number(req.params.id), req.user, h, a)));
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/matches/:id/forfeit  body: { team_id? } - doi truong bo tran (BTC ghi nhan thay thi gui team_id)
router.post('/tournaments/matches/:id/forfeit', requireAuthenticated, async (req, res, next) => {
  try {
    res.json(await withTransaction((c) => league.forfeit(c, Number(req.params.id), req.user, req.body?.team_id)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
