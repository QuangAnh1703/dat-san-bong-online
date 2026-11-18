'use strict';
const crypto = require('crypto');
const { AppError } = require('../lib/errors');

// Elo, bang xep hang & giai dau phong trao (PRD 2.1.9)

const RESULT_PROMPT_MIN = 10;
const LOSER_PERCENTS = [50, 60, 70, 100];
const FORFEIT_REPUTATION = 20;
const BAN_DAYS = 30;
const SLOT_STEP_MIN = 30;
const MAX_SCHEDULE_DAYS = 60;
const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const digits = (s) => String(s || '').replace(/\D/g, '');

async function notify(c, userId, type, title, body, refKind = null, refId = null) {
  if (!userId) return;
  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, type, title, body, refKind, refId]
  );
}

// Kèo thống nhất trước trận: đội thua chịu loserPercent% tổng chi phí, hòa thì chia đôi
const dealNote = (p) =>
  p === 50 ? 'Chia đôi tiền sân 50/50' : p === 100 ? 'Thua trả 100% tiền sân' : `Thua trả ${p}%, thắng trả ${100 - p}% tiền sân`;

function settleAmounts(total, homeGoals, awayGoals, loserPercent) {
  const t = Math.round(Number(total));
  if (homeGoals === awayGoals) return { loserPercent: 50, home: Math.round(t / 2), away: t - Math.round(t / 2) };
  const loser = Math.round((t * loserPercent) / 100);
  return homeGoals > awayGoals
    ? { loserPercent, home: t - loser, away: loser }
    : { loserPercent, home: loser, away: t - loser };
}

// ---------------------------------------------------------------- Elo

/**
 * Elo chuan, K = 32 nhan he so fair-play (diem uy tin doi 0-100 -> 0.5-1.0):
 * doi choi xau duoc cong it hon khi thang, bi tru it hon khi thua van tinh theo K cua chinh doi do.
 */
function eloDeltas(home, away, homeGoals, awayGoals) {
  const expectedHome = 1 / (1 + 10 ** ((away.elo - home.elo) / 400));
  const scoreHome = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
  const k = (t) => 32 * (0.5 + 0.5 * (Number(t.reputation_score) / 100));
  return {
    home: Math.round(k(home) * (scoreHome - expectedHome)),
    away: Math.round(k(away) * (1 - scoreHome - (1 - expectedHome))),
  };
}

async function applyElo(c, homeId, awayId, hg, ag) {
  const t = await c.query(`SELECT id, elo, reputation_score FROM team WHERE id = ANY($1) FOR UPDATE`, [[homeId, awayId]]);
  const home = t.rows.find((x) => String(x.id) === String(homeId));
  const away = t.rows.find((x) => String(x.id) === String(awayId));
  const d = eloDeltas(home, away, hg, ag);
  const upd = (id, delta, gf, ga) =>
    c.query(
      `UPDATE team SET elo = GREATEST(100, elo + $2),
                       wins = wins + ($3 > $4)::int, draws = draws + ($3 = $4)::int, losses = losses + ($3 < $4)::int,
                       win_streak = CASE WHEN $3 > $4 THEN win_streak + 1 ELSE 0 END
        WHERE id = $1`,
      [id, delta, gf, ga]
    );
  await upd(homeId, d.home, hg, ag);
  await upd(awayId, d.away, ag, hg);
  return d;
}

// Tran cap keo da chot: doi nha = doi dat san, doi khach = doi duoc chap nhan
async function loadChallenge(c, bookingCode, lock = false) {
  const r = await c.query(
    `SELECT b.id AS booking_id, b.code, b.status, mp.loser_percent,
            b.total_amount + COALESCE((SELECT sum(o.total) FROM service_order o WHERE o.booking_id = b.id), 0) AS total_cost,
            (SELECT max(upper(s.time_range)) FROM booking_slot s WHERE s.booking_id = b.id) AS ends_at,
            ht.id AS home_team_id, ht.name AS home_name, ht.captain_id AS home_captain,
            at.id AS away_team_id, at.name AS away_name, at.captain_id AS away_captain, v.owner_id
       FROM booking b
       JOIN venue v ON v.id = b.venue_id
       JOIN match_post mp ON mp.booking_id = b.id AND mp.type = 'TEAM_FINDS_TEAM' AND mp.status = 'MATCHED'
       JOIN team ht ON ht.id = mp.team_id
       JOIN join_request jr ON jr.post_id = mp.id AND jr.status = 'ACCEPTED' AND jr.requester_team_id IS NOT NULL
       JOIN team at ON at.id = jr.requester_team_id
      WHERE b.code = $1 ${lock ? 'FOR UPDATE OF b' : ''}`,
    [bookingCode]
  );
  return r.rows[0] || null;
}

const PLAYED_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

// Tran cap keo da da xong tai san cua chu san, chua co ket qua chot (ADMIN thay tat ca san)
async function listOwnerPendingResults(c, user) {
  const r = await c.query(
    `SELECT b.code, v.name AS venue_name, e.starts_at, e.ends_at, ht.name AS home_name, at.name AS away_name,
            mp.loser_percent
       FROM booking b
       JOIN venue v ON v.id = b.venue_id
       JOIN match_post mp ON mp.booking_id = b.id AND mp.type = 'TEAM_FINDS_TEAM' AND mp.status = 'MATCHED'
       JOIN team ht ON ht.id = mp.team_id
       JOIN join_request jr ON jr.post_id = mp.id AND jr.status = 'ACCEPTED' AND jr.requester_team_id IS NOT NULL
       JOIN team at ON at.id = jr.requester_team_id
       CROSS JOIN LATERAL (SELECT min(lower(s.time_range)) AS starts_at, max(upper(s.time_range)) AS ends_at
                             FROM booking_slot s WHERE s.booking_id = b.id) e
      WHERE b.status = ANY($3) AND e.ends_at <= now() AND e.ends_at > now() - interval '14 days'
        AND ($2 OR v.owner_id = $1)
        AND NOT EXISTS (SELECT 1 FROM match_result mr WHERE mr.booking_id = b.id AND mr.status = 'CONFIRMED')
      ORDER BY e.ends_at DESC LIMIT 50`,
    [user.id, user.role === 'ADMIN', PLAYED_STATUSES]
  );
  return r.rows;
}

/**
 * Chu san nhap ty so tran cap keo -> chot ngay: tinh Elo, chia tien san theo keo, bao 2 doi truong.
 * Ty so ghi vao ca hai cot claim de man hinh nguoi choi doc nhu truoc.
 */
async function recordResult(c, bookingCode, user, hg, ag) {
  const m = await loadChallenge(c, bookingCode, true);
  if (!m) throw new AppError('NOT_FOUND', { message: 'Không phải trận cáp kèo đã chốt đối' });
  if (user.role !== 'ADMIN' && m.owner_id !== user.id) {
    throw new AppError('FORBIDDEN', { message: 'Chỉ chủ sân nơi diễn ra trận được nhập tỷ số' });
  }
  if (!PLAYED_STATUSES.includes(m.status) || new Date(m.ends_at) > new Date()) {
    throw new AppError('INVALID_STATUS', { message: 'Trận chưa kết thúc' });
  }

  await c.query(
    `INSERT INTO match_result (booking_id, home_team_id, away_team_id) VALUES ($1, $2, $3)
     ON CONFLICT (booking_id) DO NOTHING`,
    [m.booking_id, m.home_team_id, m.away_team_id]
  );
  const cur = (await c.query(`SELECT * FROM match_result WHERE booking_id = $1 FOR UPDATE`, [m.booking_id])).rows[0];
  if (cur.status === 'CONFIRMED') throw new AppError('INVALID_STATUS', { message: 'Kết quả đã được chốt' });

  const d = await applyElo(c, m.home_team_id, m.away_team_id, hg, ag);
  const pay = settleAmounts(m.total_cost, hg, ag, m.loser_percent);
  const done = (
    await c.query(
      `UPDATE match_result SET status = 'CONFIRMED', home_claim_home = $2, home_claim_away = $3,
                               away_claim_home = $2, away_claim_away = $3, home_elo_delta = $4, away_elo_delta = $5,
                               confirmed_at = now(), dispute_due_at = NULL, loser_percent = $6, total_amount = $7,
                               home_amount = $8, away_amount = $9, recorded_by = $10, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [cur.id, hg, ag, d.home, d.away, pay.loserPercent, Number(m.total_cost), pay.home, pay.away, user.id]
    )
  ).rows[0];
  const score = `${m.home_name} ${hg}-${ag} ${m.away_name}`;
  const rule = hg === ag ? 'hòa chia đôi' : `kèo thua trả ${pay.loserPercent}%`;
  for (const [cap, delta, amount] of [[m.home_captain, d.home, pay.home], [m.away_captain, d.away, pay.away]]) {
    await notify(c, cap, 'MATCH_RESULT_CONFIRMED', `Kết quả trận ${m.code} đã chốt`, `Chủ sân nhập tỷ số ${score}. Elo ${delta >= 0 ? '+' : ''}${delta}. Theo ${rule}, đội bạn chịu ${vnd(amount)} tiền sân.`, 'BOOKING', m.booking_id);
  }
  return { status: 'CONFIRMED', result: done };
}

/**
 * Job nen: sau khi tran ket thuc RESULT_PROMPT_MIN phut, nhac chu san nhap ty so (tran cap keo chua chot)
 * va nhac BTC nhap ket qua (tran giai chua co ty so). Moi tran chi nhac mot lan; bo qua tran da qua > 14 ngay.
 */
async function remindMatchResults(c) {
  const challenges = await c.query(
    `SELECT b.id AS booking_id, b.code, v.owner_id, ht.name AS home_name, at.name AS away_name
       FROM booking b
       JOIN venue v ON v.id = b.venue_id
       JOIN match_post mp ON mp.booking_id = b.id AND mp.type = 'TEAM_FINDS_TEAM' AND mp.status = 'MATCHED'
       JOIN team ht ON ht.id = mp.team_id
       JOIN join_request jr ON jr.post_id = mp.id AND jr.status = 'ACCEPTED' AND jr.requester_team_id IS NOT NULL
       JOIN team at ON at.id = jr.requester_team_id
       CROSS JOIN LATERAL (SELECT max(upper(s.time_range)) AS ends_at FROM booking_slot s
                            WHERE s.booking_id = b.id AND s.status <> 'RELEASED') e
      WHERE b.status = ANY($2)
        AND e.ends_at <= now() - make_interval(mins => $1) AND e.ends_at > now() - interval '14 days'
        AND NOT EXISTS (SELECT 1 FROM match_result mr WHERE mr.booking_id = b.id AND mr.status = 'CONFIRMED')
        AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.type = 'MATCH_RESULT_OWNER_DUE' AND n.ref_id = b.id)`,
    [RESULT_PROMPT_MIN, PLAYED_STATUSES]
  );
  for (const m of challenges.rows) {
    await notify(c, m.owner_id, 'MATCH_RESULT_OWNER_DUE', `Nhập tỷ số trận ${m.code}`, `${m.home_name} vs ${m.away_name} đã kết thúc. Nhập tỷ số để tính điểm Elo và chia tiền sân.`, 'BOOKING', m.booking_id);
  }

  const tournaments = await c.query(
    `SELECT m.id, m.booking_id, t.organizer_id, t.name AS tournament_name, h.name AS home_name, a.name AS away_name
       FROM tournament_match m
       JOIN tournament t ON t.id = m.tournament_id
       JOIN team h ON h.id = m.home_team_id
       JOIN team a ON a.id = m.away_team_id
      WHERE m.status = 'SCHEDULED' AND m.booking_id IS NOT NULL
        AND m.starts_at + make_interval(mins => t.match_minutes + $1) <= now()
        AND m.starts_at > now() - interval '14 days'
        AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.type = 'TOURNAMENT_RESULT_DUE' AND n.ref_id = m.booking_id)`,
    [RESULT_PROMPT_MIN]
  );
  for (const m of tournaments.rows) {
    await notify(c, m.organizer_id, 'TOURNAMENT_RESULT_DUE', `Nhập kết quả ${m.home_name} vs ${m.away_name}`, `Trận thuộc giải ${m.tournament_name} đã kết thúc, hãy cập nhật tỷ số.`, 'BOOKING', m.booking_id);
  }
  return challenges.rowCount + tournaments.rowCount;
}

// ---------------------------------------------------------------- Giai dau

function makeFeeCode() {
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `GI${ymd}${crypto.randomBytes(4).toString('hex').slice(0, 5).toUpperCase()}`;
}

async function registeredCount(c, tournamentId) {
  const r = await c.query(`SELECT count(*) AS n FROM tournament_team WHERE tournament_id = $1 AND status = 'REGISTERED'`, [tournamentId]);
  return Number(r.rows[0].n);
}

// Vong tron (circle method): moi cap gap nhau mot lan
function roundRobinRounds(teams) {
  const list = teams.length % 2 ? [...teams, null] : [...teams];
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

// Xep tran vao o trong cua san to chuc: thu tung moc 30 phut trong khung gio moi ngay,
// trung lich (rang buoc no_slot_overlap) thi lui sang moc sau
async function placeMatch(c, t, cursor, label) {
  for (let guard = 0; guard < MAX_SCHEDULE_DAYS * 48; guard++) {
    const dayStart = new Date(cursor.date);
    if (cursor.minute + t.match_minutes > t.daily_end_minute) {
      cursor.date = new Date(dayStart.getTime() + 86_400_000);
      cursor.minute = t.daily_start_minute;
      continue;
    }
    const ymd = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
    const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const startMin = cursor.minute;
    const startsAt = new Date(`${ymd}T${hhmm(startMin)}:00`);
    cursor.minute += SLOT_STEP_MIN;
    if (startsAt <= new Date()) continue;
    await c.query('SAVEPOINT place_match');
    try {
      const b = await c.query(
        `INSERT INTO booking (code, kind, status, venue_id, total_amount, deposit_amount, lock_reason, note, confirmed_at)
         VALUES ($1, 'OWNER_LOCK', 'CONFIRMED', $2, 0, 0, 'OTHER', $3, now()) RETURNING id`,
        [`TN${ymd.slice(2).replace(/-/g, '')}${crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase()}`, t.venue_id, label]
      );
      const s = await c.query(
        `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
         VALUES ($1, $2, $3::date, tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'), 0, 'LOCKED')
         RETURNING lower(time_range) AS starts_at`,
        [b.rows[0].id, t.field_id, ymd, hhmm(startMin), hhmm(startMin + t.match_minutes)]
      );
      await c.query('RELEASE SAVEPOINT place_match');
      cursor.minute = startMin + t.match_minutes;
      return { bookingId: b.rows[0].id, startsAt: s.rows[0].starts_at };
    } catch (err) {
      if (err.code !== '23P01') throw err;
      await c.query('ROLLBACK TO SAVEPOINT place_match');
    }
  }
  throw new AppError('INVALID_OPERATION', { message: `Không tìm được khung giờ trống trong ${MAX_SCHEDULE_DAYS} ngày` });
}

async function lastCursor(c, t) {
  const r = await c.query(
    `SELECT max(upper(s.time_range)) AS last FROM tournament_match m JOIN booking_slot s ON s.booking_id = m.booking_id
      WHERE m.tournament_id = $1`,
    [t.id]
  );
  if (r.rows[0].last) {
    const d = new Date(r.rows[0].last);
    return { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), minute: d.getHours() * 60 + d.getMinutes() };
  }
  const [y, m, d] = String(t.start_date_text).split('-').map(Number);
  return { date: new Date(y, m - 1, d), minute: t.daily_start_minute };
}

async function insertMatch(c, t, round, group, home, away, cursor, teamName) {
  if (!away) {
    await c.query(
      `INSERT INTO tournament_match (tournament_id, round, group_label, home_team_id, status) VALUES ($1, $2, $3, $4, 'BYE')`,
      [t.id, round, group, home]
    );
    return;
  }
  const placed = await placeMatch(c, t, cursor, `Giải ${t.name} · ${teamName(home)} vs ${teamName(away)}`);
  await c.query(
    `INSERT INTO tournament_match (tournament_id, round, group_label, home_team_id, away_team_id, booking_id, starts_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [t.id, round, group, home, away, placed.bookingId, placed.startsAt]
  );
}

async function loadTournamentForOrganizer(c, id, user) {
  const r = await c.query(`SELECT *, start_date::text AS start_date_text FROM tournament WHERE id = $1 FOR UPDATE`, [id]);
  if (r.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy giải đấu' });
  if (user.role !== 'ADMIN' && r.rows[0].organizer_id !== user.id) throw new AppError('FORBIDDEN');
  return r.rows[0];
}

/**
 * Chia bang + xep lich. Vong tron: > 5 doi thi chia bang toi da 4 doi, da vong tron trong bang.
 * Loai truc tiep: boc tham vong 1 (le doi thi mot doi duoc mien dau); goi lai de xep vong tiep.
 */
async function schedule(c, id, user) {
  const t = await loadTournamentForOrganizer(c, id, user);
  if (!['OPEN', 'ONGOING'].includes(t.status)) throw new AppError('INVALID_STATUS', { details: { status: t.status } });
  const tm = await c.query(
    `SELECT tt.team_id, tm.name FROM tournament_team tt JOIN team tm ON tm.id = tt.team_id
      WHERE tt.tournament_id = $1 AND tt.status = 'REGISTERED'`,
    [t.id]
  );
  const names = new Map(tm.rows.map((r) => [String(r.team_id), r.name]));
  const teamName = (id) => names.get(String(id)) || 'Đội';
  const notifyTeams = async (title, body) => {
    const caps = await c.query(
      `SELECT DISTINCT tm.captain_id FROM tournament_team tt JOIN team tm ON tm.id = tt.team_id
        WHERE tt.tournament_id = $1 AND tt.status = 'REGISTERED'`,
      [t.id]
    );
    for (const cap of caps.rows) await notify(c, cap.captain_id, 'TOURNAMENT_SCHEDULE', title, body);
  };

  if (t.status === 'OPEN') {
    if (tm.rowCount < 2) throw new AppError('INVALID_OPERATION', { message: 'Cần ít nhất 2 đội đã đóng lệ phí' });
    const teams = shuffle(tm.rows.map((r) => r.team_id));
    const cursor = await lastCursor(c, t);
    if (t.format === 'ROUND_ROBIN') {
      const groupCount = teams.length > 5 ? Math.ceil(teams.length / 4) : 1;
      const groups = Array.from({ length: groupCount }, () => []);
      teams.forEach((id, i) => groups[i % groupCount].push(id));
      const labels = groups.map((_, i) => (groupCount > 1 ? String.fromCharCode(65 + i) : null));
      for (const [gi, g] of groups.entries()) {
        for (const id of g) {
          await c.query(`UPDATE tournament_team SET group_label = $3 WHERE tournament_id = $1 AND team_id = $2`, [t.id, id, labels[gi]]);
        }
      }
      // Xen ke cac bang theo tung luot de doi nao cung co thoi gian nghi
      const perGroup = groups.map((g) => roundRobinRounds(g));
      const maxRounds = Math.max(...perGroup.map((r) => r.length));
      for (let r = 0; r < maxRounds; r++) {
        for (const [gi, rounds] of perGroup.entries()) {
          for (const [h, a] of rounds[r] || []) await insertMatch(c, t, r + 1, labels[gi], h, a, cursor, teamName);
        }
      }
    } else {
      for (let i = 0; i < teams.length; i += 2) await insertMatch(c, t, 1, null, teams[i], teams[i + 1] || null, cursor, teamName);
    }
    // Doi chua dong le phi khong duoc thi dau
    await c.query(`UPDATE tournament_team SET status = 'WITHDRAWN' WHERE tournament_id = $1 AND status = 'PENDING_PAYMENT'`, [t.id]);
    await c.query(`UPDATE tournament SET status = 'ONGOING' WHERE id = $1`, [t.id]);
    await notifyTeams(`Giải ${t.name} đã có lịch thi đấu`, 'Xem lịch thi đấu và bảng đấu trong trang giải.');
    return { status: 'ONGOING' };
  }

  if (t.format !== 'KNOCKOUT') throw new AppError('INVALID_OPERATION', { message: 'Giải vòng tròn đã xếp toàn bộ lịch' });
  const last = await c.query(`SELECT max(round) AS r FROM tournament_match WHERE tournament_id = $1`, [t.id]);
  const round = Number(last.rows[0].r);
  const ms = await c.query(`SELECT * FROM tournament_match WHERE tournament_id = $1 AND round = $2 ORDER BY id`, [t.id, round]);
  if (ms.rows.some((m) => m.status === 'SCHEDULED')) {
    throw new AppError('INVALID_OPERATION', { message: 'Vòng hiện tại còn trận chưa có kết quả' });
  }
  const winners = ms.rows.map((m) => winnerOf(m));
  if (winners.length === 1) {
    await c.query(`UPDATE tournament SET status = 'FINISHED' WHERE id = $1`, [t.id]);
    await notifyTeams(`Giải ${t.name} đã kết thúc`, `Vô địch: ${teamName(winners[0])}.`);
    return { status: 'FINISHED', champion_team_id: winners[0] };
  }
  const cursor = await lastCursor(c, t);
  for (let i = 0; i < winners.length; i += 2) await insertMatch(c, t, round + 1, null, winners[i], winners[i + 1] || null, cursor, teamName);
  await notifyTeams(`Giải ${t.name}: đã xếp vòng ${round + 1}`, 'Xem lịch thi đấu trong trang giải.');
  return { status: 'ONGOING', round: round + 1 };
}

function winnerOf(m) {
  if (m.status === 'BYE') return m.home_team_id;
  if (m.status === 'FORFEIT') return String(m.forfeit_team_id) === String(m.home_team_id) ? m.away_team_id : m.home_team_id;
  return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
}

async function lockMatch(c, matchId) {
  const r = await c.query(
    `SELECT m.*, t.organizer_id, t.format, t.name AS tournament_name, t.status AS t_status
       FROM tournament_match m JOIN tournament t ON t.id = m.tournament_id WHERE m.id = $1 FOR UPDATE OF m`,
    [matchId]
  );
  if (r.rowCount === 0) throw new AppError('NOT_FOUND', { message: 'Không tìm thấy trận đấu' });
  return r.rows[0];
}

async function finishIfRoundRobinDone(c, tournamentId) {
  const r = await c.query(
    `UPDATE tournament SET status = 'FINISHED'
      WHERE id = $1 AND format = 'ROUND_ROBIN' AND status = 'ONGOING'
        AND NOT EXISTS (SELECT 1 FROM tournament_match WHERE tournament_id = $1 AND status = 'SCHEDULED')`,
    [tournamentId]
  );
  return r.rowCount > 0;
}

// BTC nhap ket qua tran trong giai
async function recordMatchResult(c, matchId, user, home, away) {
  const m = await lockMatch(c, matchId);
  if (user.role !== 'ADMIN' && m.organizer_id !== user.id) throw new AppError('FORBIDDEN');
  if (m.status !== 'SCHEDULED') throw new AppError('INVALID_STATUS', { details: { status: m.status } });
  if (m.format === 'KNOCKOUT' && home === away) {
    throw new AppError('INVALID_FIELD', { message: 'Loại trực tiếp phải có đội thắng (tính cả luân lưu)' });
  }
  await c.query(`UPDATE tournament_match SET home_score = $2, away_score = $3, status = 'PLAYED' WHERE id = $1`, [m.id, home, away]);
  const finished = await finishIfRoundRobinDone(c, m.tournament_id);
  return { id: m.id, status: 'PLAYED', tournament_finished: finished };
}

/**
 * PRD 2.1.9.2: doi tu y huy tran trong giai -> xu thua 0-3, tru 20 diem uy tin doi, cam dang ky giai 30 ngay.
 */
async function forfeit(c, matchId, user, teamIdForOrganizer) {
  const m = await lockMatch(c, matchId);
  if (m.status !== 'SCHEDULED') throw new AppError('INVALID_STATUS', { details: { status: m.status } });
  const teams = await c.query(`SELECT id, name, captain_id FROM team WHERE id = ANY($1)`, [[m.home_team_id, m.away_team_id]]);
  let quitter = teams.rows.find((t) => t.captain_id === user.id);
  if (!quitter && (user.role === 'ADMIN' || m.organizer_id === user.id)) {
    quitter = teams.rows.find((t) => String(t.id) === String(teamIdForOrganizer));
  }
  if (!quitter) throw new AppError('FORBIDDEN');
  const quitterIsHome = String(quitter.id) === String(m.home_team_id);
  await c.query(
    `UPDATE tournament_match SET status = 'FORFEIT', forfeit_team_id = $2, home_score = $3, away_score = $4 WHERE id = $1`,
    [m.id, quitter.id, quitterIsHome ? 0 : 3, quitterIsHome ? 3 : 0]
  );
  if (m.booking_id) {
    await c.query(
      `UPDATE booking SET status = 'CANCELLED_BY_OWNER', cancelled_at = now(), cancel_reason = 'Đội bỏ trận trong giải' WHERE id = $1`,
      [m.booking_id]
    );
    await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [m.booking_id]);
  }
  const t = await c.query(
    `UPDATE team SET reputation_score = GREATEST(0, reputation_score - $2),
                     tournament_banned_until = now() + make_interval(days => $3)
      WHERE id = $1 RETURNING reputation_score, tournament_banned_until`,
    [quitter.id, FORFEIT_REPUTATION, BAN_DAYS]
  );
  await notify(
    c,
    quitter.captain_id,
    'TOURNAMENT_FORFEIT',
    `Đội ${quitter.name} bị xử thua 0-3`,
    `Bỏ trận trong giải ${m.tournament_name}: trừ ${FORFEIT_REPUTATION} điểm uy tín đội (còn ${t.rows[0].reputation_score}) và cấm đăng ký giải ${BAN_DAYS} ngày.`,
    'TEAM',
    quitter.id
  );
  const other = teams.rows.find((x) => x.id !== quitter.id);
  await notify(c, other?.captain_id, 'TOURNAMENT_FORFEIT', `Đối thủ bỏ trận · bạn thắng 3-0`, `Giải ${m.tournament_name}.`);
  await notify(c, m.organizer_id, 'TOURNAMENT_FORFEIT', `${quitter.name} bỏ trận`, `Giải ${m.tournament_name}: xử thua 0-3.`);
  const finished = await finishIfRoundRobinDone(c, m.tournament_id);
  return { id: m.id, status: 'FORFEIT', forfeit_team_id: quitter.id, tournament_finished: finished };
}

// Bang xep hang vong tron: thang 3, hoa 1, thua 0; xep theo diem, hieu so, ban thang
function standings(teams, matches) {
  const rows = new Map(teams.map((t) => [String(t.team_id), { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }]));
  for (const m of matches) {
    if (!['PLAYED', 'FORFEIT'].includes(m.status)) continue;
    const h = rows.get(String(m.home_team_id));
    const a = rows.get(String(m.away_team_id));
    if (!h || !a) continue;
    for (const [x, gf, ga] of [[h, m.home_score, m.away_score], [a, m.away_score, m.home_score]]) {
      x.played++;
      x.gf += gf;
      x.ga += ga;
      if (gf > ga) (x.won++, (x.points += 3));
      else if (gf === ga) (x.drawn++, (x.points += 1));
      else x.lost++;
    }
  }
  return [...rows.values()].sort(
    (a, b) => (a.group_label || '').localeCompare(b.group_label || '') || b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf
  );
}

module.exports = {
  eloDeltas,
  LOSER_PERCENTS,
  dealNote,
  settleAmounts,
  remindMatchResults,
  loadChallenge,
  listOwnerPendingResults,
  recordResult,
  makeFeeCode,
  registeredCount,
  schedule,
  recordMatchResult,
  forfeit,
  standings,
  roundRobinRounds,
};
