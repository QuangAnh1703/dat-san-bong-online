'use strict';
// Seed du lieu demo tren cac tai khoan co san: tran cap keo da da (co ty so, Elo), keo dang mo tim doi,
// keo da chot sap da, don dat le va hop dong dinh ky. Chay tay: node src/db/seed-demo.js
// Chi chay mot lan: neu da co doi "FC Mỹ Đình Star" thi dung lai.
const { pool, withTransaction } = require('../db');
const { quoteSlot } = require('../services/pricing.service');
const { recordResult, dealNote } = require('../services/tournament.service');

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const rnd = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const code = (date) => `BK${date.slice(2).replace(/-/g, '')}${rnd()}`;
const at = (date, time, minusHours = 0) => new Date(new Date(`${date}T${time}:00+07:00`).getTime() - minusHours * 3600e3);

async function field(c, fieldId) {
  const r = await c.query(
    `SELECT f.id, f.type, f.venue_id, v.deposit_rate, v.district_code, v.owner_id
       FROM field f JOIN venue v ON v.id = f.venue_id WHERE f.id = $1`,
    [fieldId]
  );
  return r.rows[0];
}

async function addSlot(c, bookingId, f, date, start, end, price, quote) {
  // Khong dung fn_is_slot_available vi ham do tu choi khung gio da qua (o day can seed ca tran cu)
  const clash = await c.query(
    `SELECT 1 FROM booking_slot WHERE field_id = $1 AND status IN ('HELD', 'CONFIRMED', 'LOCKED')
        AND time_range && tstzrange(($2 || ' ' || $3)::timestamptz, ($2 || ' ' || $4)::timestamptz, '[)')`,
    [f.id, date, start, end]
  );
  if (clash.rowCount) throw new Error(`Trung lich san ${f.id} ${date} ${start}`);
  const s = await c.query(
    `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
     VALUES ($1, $2, $3::date, tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'), $6, 'CONFIRMED')
     RETURNING id`,
    [bookingId, f.id, date, start, end, price]
  );
  await c.query(
    `INSERT INTO price_history (booking_slot_id, price_rule_id, base_price, discount_amount, final_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [s.rows[0].id, quote.priceRuleId, quote.baseAmount, quote.baseAmount - price, price]
  );
}

// Tien coc da ve qua chuyen khoan (gia lap webhook ngan hang, provider MOCK nhu cac ban ghi test khac)
async function paid(c, b, amount, when) {
  await c.query(
    `INSERT INTO bank_transaction (provider, provider_txn_id, account_number, bank_name, amount, content,
                                   transaction_at, booking_id, status, raw_payload, received_at)
     VALUES ('MOCK', gen_random_uuid()::text, '0123456789', 'Vietcombank', $1, $2, $3, $4, 'APPLIED', $5, $3)`,
    [amount, `SANBONG ${b.code}`, when, b.id, JSON.stringify({ mock: true, seed: 'demo', amount, content: `SANBONG ${b.code}` })]
  );
}

// Don dat le da coc, trang thai CONFIRMED (job nen / buoc cuoi se chuyen COMPLETED khi gio da qua)
async function single(c, { userId, fieldId, date, start, end, teamId = null, payFull = false, note = null }) {
  const f = await field(c, fieldId);
  const q = await quoteSlot(c, { venueId: f.venue_id, fieldType: f.type, playDate: date, start, end });
  const deposit = payFull ? q.amount : Math.round(q.amount * Number(f.deposit_rate));
  const created = at(date, start, 24 * 3 + 5);
  const b = (
    await c.query(
      `INSERT INTO booking (code, kind, status, venue_id, user_id, team_id, total_amount, deposit_amount,
                            discount_amount, note, confirmed_at, created_at, updated_at)
       VALUES ($1, 'SINGLE', 'CONFIRMED', $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING id, code`,
      [code(created.toISOString().slice(0, 10)), f.venue_id, userId, teamId, q.amount, deposit, q.discount, note,
        new Date(created.getTime() + 3 * 60e3), created]
    )
  ).rows[0];
  await addSlot(c, b.id, f, date, start, end, q.amount, q);
  await paid(c, b, deposit, new Date(created.getTime() + 2 * 60e3));
  return { ...b, f, created, total: q.amount };
}

async function chat(c, bookingId, postId, userIds, lines, from) {
  const conv = (
    await c.query(`INSERT INTO conversation (booking_id, match_post_id, created_at) VALUES ($1, $2, $3) RETURNING id`, [
      bookingId,
      postId,
      from,
    ])
  ).rows[0].id;
  for (const u of new Set(userIds)) {
    await c.query(
      `INSERT INTO conversation_member (conversation_id, user_id, joined_at, last_read_at) VALUES ($1, $2, $3, now())
       ON CONFLICT DO NOTHING`,
      [conv, u, from]
    );
  }
  let t = from.getTime();
  for (const [sender, content] of lines) {
    t += 7 * 60e3;
    await c.query(`INSERT INTO message (conversation_id, sender_id, content, created_at) VALUES ($1, $2, $3, $4)`, [
      conv,
      sender,
      content,
      new Date(t),
    ]);
  }
}

/**
 * Tran cap keo: doi nha dat san + dang tim doi, cac doi khac gui loi moi.
 * accepted = doi khach duoc chot (null = keo dang mo), rejected = cac doi bi tu choi / dang cho.
 */
async function challenge(c, T, m) {
  const home = T[m.home];
  const b = await single(c, { userId: home.captain, fieldId: m.field, date: m.date, start: m.start, end: m.end, teamId: home.id, note: m.note });
  const lp = m.loser ?? 50;
  const posted = new Date(b.created.getTime() + 5 * 60e3);
  const post = (
    await c.query(
      `INSERT INTO match_post (type, status, booking_id, author_user_id, team_id, district_code, play_date, time_span,
                               required_level, deal_note, loser_percent, content, expires_at, closed_at, created_at)
       VALUES ('TEAM_FINDS_TEAM', $1, $2, $3, $4, $5, $6::date, int4range($7, $8), $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [m.away ? 'MATCHED' : 'OPEN', b.id, home.captain, home.id, b.f.district_code, m.date, toMin(m.start), toMin(m.end),
        home.level, dealNote(lp), lp, m.note || '', at(m.date, m.start), m.away ? new Date(posted.getTime() + 6 * 3600e3) : null, posted]
    )
  ).rows[0].id;

  let t = posted.getTime();
  for (const key of m.others || []) {
    t += 40 * 60e3;
    await c.query(
      `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, status, responded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [post, T[key].captain, T[key].id, 'Bên mình nhận kèo nhé, đá vui vẻ!', m.away ? 'REJECTED' : 'PENDING',
        m.away ? new Date(posted.getTime() + 6 * 3600e3) : null, new Date(t)]
    );
  }
  if (!m.away) return b;

  const away = T[m.away];
  await c.query(
    `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, status, responded_at, created_at)
     VALUES ($1, $2, $3, $4, 'ACCEPTED', $5, $6)`,
    [post, away.captain, away.id, `${away.name} xin kèo, trình ${away.levelVi}, đá fair-play.`,
      new Date(posted.getTime() + 6 * 3600e3), new Date(posted.getTime() + 20 * 60e3)]
  );
  const members = [away.captain, ...away.members, ...home.members];
  for (const u of members) {
    await c.query(
      `INSERT INTO match_participant (booking_id, user_id, source, joined_at) VALUES ($1, $2, 'TEAM', $3)
       ON CONFLICT DO NOTHING`,
      [b.id, u, new Date(posted.getTime() + 6 * 3600e3)]
    );
  }
  await chat(c, b.id, post, [home.captain, away.captain, ...home.members, ...away.members], [
    [home.captain, `Chào ${away.name}, chốt kèo ${m.start} ngày ${m.date.slice(8)}/${m.date.slice(5, 7)} nhé. ${dealNote(lp)}.`],
    [away.captain, 'Ok anh, bên em đủ quân rồi. Áo đội em màu xanh.'],
    [home.captain, 'Bên anh mặc áo đỏ. Có mặt trước 15 phút khởi động nhé.'],
    [away.captain, 'Chuẩn, hẹn gặp ở sân!'],
  ], new Date(posted.getTime() + 6 * 3600e3));
  return b;
}

async function recurring(c, { userId, fieldId, weekdays, startDate, months, start, end, note }) {
  const f = await field(c, fieldId);
  const first = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + months);
  const dates = [];
  for (let d = new Date(first); d < last; d.setUTCDate(d.getUTCDate() + 1)) {
    if (weekdays.includes(((d.getUTCDay() + 6) % 7) + 1)) dates.push(d.toISOString().slice(0, 10));
  }
  const percent = months >= 3 ? 15 : 10;
  const quotes = [];
  for (const d of dates) quotes.push(await quoteSlot(c, { venueId: f.venue_id, fieldType: f.type, playDate: d, start, end }));
  const per = quotes.map((q) => Math.round((q.baseAmount * (100 - percent)) / 100));
  const gross = quotes.reduce((s, q) => s + q.baseAmount, 0);
  const total = per.reduce((s, x) => s + x, 0);
  const deposit = Math.round(total * Number(f.deposit_rate));
  const created = at(dates[0], '09:00', 24 * 4);
  const b = (
    await c.query(
      `INSERT INTO booking (code, kind, status, venue_id, user_id, total_amount, deposit_amount, discount_amount,
                            note, confirmed_at, created_at, updated_at)
       VALUES ($1, 'RECURRING', 'CONFIRMED', $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id, code`,
      [code(created.toISOString().slice(0, 10)), f.venue_id, userId, total, deposit, gross - total, note,
        new Date(created.getTime() + 3 * 60e3), created]
    )
  ).rows[0];
  for (let i = 0; i < dates.length; i++) await addSlot(c, b.id, f, dates[i], start, end, per[i], quotes[i]);
  await c.query(
    `INSERT INTO recurring_contract (booking_id, weekdays, start_date, end_date, time_span, sessions_total, discount_percent, created_at)
     VALUES ($1, $2, $3, $4, int4range($5, $6), $7, $8, $9)`,
    [b.id, [...weekdays].sort(), dates[0], dates[dates.length - 1], toMin(start), toMin(end), dates.length, percent, created]
  );
  await paid(c, b, deposit, new Date(created.getTime() + 2 * 60e3));
  return { ...b, sessions: dates.length, total };
}

async function review(c, b, userId, pitch, service, comment) {
  await c.query(
    `INSERT INTO review (booking_id, venue_id, user_id, pitch_rating, service_rating, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now()) ON CONFLICT (booking_id) DO NOTHING`,
    [b.id, b.f.venue_id, userId, pitch, service, comment]
  );
}

async function main() {
  await withTransaction(async (c) => {
    const exists = await c.query(`SELECT 1 FROM team WHERE name = 'FC Mỹ Đình Star'`);
    if (exists.rowCount) throw new Error('Du lieu demo da duoc seed truoc do - dung lai');

    // Doi bong: doi co san + 3 doi moi cho cac tai khoan chua co doi
    const LEVEL_VI = { BEGINNER: 'mới chơi', INTERMEDIATE: 'trung bình', GOOD: 'khá', SEMI_PRO: 'phủi' };
    const T = {
      BK: { id: 1, captain: 1, members: [141] },
      SH: { id: 2, captain: 3, members: [133] },
      GL: { id: 120, captain: 159, members: [223] },
      TA: { id: 137, captain: 222, members: [] },
      TB: { id: 138, captain: 224, members: [] },
      FT: { id: 139, captain: 160, members: [] },
    };
    for (const [key, name, captain, district, level, member] of [
      ['MD', 'FC Mỹ Đình Star', 2, 'HN_NTL', 'INTERMEDIATE', 136],
      ['TX', 'FC Thanh Xuân', 127, 'HN_TX', 'GOOD', 139],
      ['LB', 'FC Long Biên Boys', 226, 'HN_LB', 'INTERMEDIATE', 149],
    ]) {
      const t = await c.query(
        `INSERT INTO team (name, captain_id, district_code, skill_level, member_count, created_at)
         VALUES ($1, $2, $3, $4, 12, now() - interval '60 days') RETURNING id`,
        [name, captain, district, level]
      );
      await c.query(`INSERT INTO team_member (team_id, user_id, role_in_team) VALUES ($1, $2, 'CAPTAIN')`, [t.rows[0].id, captain]);
      T[key] = { id: t.rows[0].id, captain, members: [member] };
    }
    await c.query(`UPDATE team SET district_code = 'HN_BTL' WHERE id IN (137, 138, 139) AND district_code IS NULL`);
    for (const t of Object.values(T)) {
      for (const u of t.members) {
        await c.query(`INSERT INTO team_member (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [t.id, u]);
      }
      const r = (await c.query(`SELECT name, skill_level FROM team WHERE id = $1`, [t.id])).rows[0];
      Object.assign(t, { name: r.name, level: r.skill_level, levelVi: LEVEL_VI[r.skill_level] });
    }

    // 1) Tran cap keo da da (theo thu tu thoi gian de Elo cong don dung)
    const played = [
      { home: 'BK', away: 'SH', others: ['GL'], field: 101, date: '2026-10-24', start: '19:00', end: '20:30', loser: 70, score: [3, 2], rate: [5, 4, 'Sân đẹp, cỏ mới, đèn sáng.'] },
      { home: 'GL', away: 'TX', field: 109, date: '2026-10-26', start: '18:30', end: '20:00', score: [1, 1] },
      { home: 'MD', away: 'LB', others: ['FT'], field: 145, date: '2026-10-29', start: '19:30', end: '21:00', loser: 60, score: [2, 4], rate: [4, 4, 'Chủ sân nhiệt tình, nước uống đầy đủ.'] },
      { home: 'SH', away: 'TA', field: 236, date: '2026-11-01', start: '17:00', end: '18:30', loser: 100, score: [3, 0] },
      { home: 'TX', away: 'BK', others: ['TB'], field: 246, date: '2026-11-03', start: '19:00', end: '20:30', score: [2, 2], rate: [4, 5, 'Trận hay, sân hơi trơn khi mưa.'] },
      { home: 'LB', away: 'TB', field: 320, date: '2026-11-06', start: '20:00', end: '21:30', loser: 70, score: [5, 3] },
      { home: 'TA', away: 'FT', field: 193, date: '2026-11-08', start: '07:00', end: '08:30', score: [1, 2] },
      { home: 'BK', away: 'MD', others: ['TA'], field: 125, date: '2026-11-11', start: '19:30', end: '21:00', loser: 60, score: [4, 1], rate: [5, 5, 'Rất ổn, sẽ quay lại.'] },
      { home: 'TB', away: 'GL', field: 448, date: '2026-11-14', start: '18:00', end: '19:30', score: [0, 1] },
      { home: 'FT', away: 'SH', field: 279, date: '2026-11-16', start: '16:00', end: '17:30', loser: 70, score: [2, 3] },
      { home: 'MD', away: 'TX', field: 154, date: '2026-11-17', start: '19:00', end: '20:30', score: [3, 3] },
      // Da xong hom qua, chu san chua nhap ty so -> hien o muc "cho nhap ty so" cua chu san
      { home: 'GL', away: 'LB', field: 299, date: '2026-11-18', start: '19:30', end: '21:00', loser: 60 },
    ];
    for (const m of played) {
      const b = await challenge(c, T, m);
      if (m.score) await recordResult(c, b.code, { id: b.f.owner_id, role: 'OWNER' }, m.score[0], m.score[1]);
      if (m.rate) await review(c, b, T[m.home].captain, ...m.rate);
    }

    // 2) Don dat le da da (khong cap keo) kem danh gia
    for (const [userId, fieldId, date, start, end, rate] of [
      [2, 400, '2026-10-30', '18:00', '19:30', [4, 4, 'Giá hợp lý, gửi xe tiện.']],
      [127, 490, '2026-11-05', '19:00', '20:30', [5, 4, 'Sân rộng, khung thành chắc chắn.']],
      [226, 321, '2026-11-09', '08:00', '09:30', [3, 4, 'Cỏ hơi mòn ở góc sân.']],
      [159, 110, '2026-11-13', '20:00', '21:30', null],
      [223, 155, '2026-11-15', '17:30', '19:00', [5, 5, 'Tuyệt vời!']],
    ]) {
      const b = await single(c, { userId, fieldId, date, start, end, payFull: true });
      if (rate) await review(c, b, userId, ...rate);
    }

    // 3) Keo dang mo tim doi (sap da), co doi dang gui loi moi cho duyet
    for (const m of [
      { home: 'BK', others: ['GL', 'MD'], field: 102, date: '2026-11-21', start: '19:00', end: '20:30', loser: 70, note: 'Tìm đối trình khá, đá vui vẻ không cay cú.' },
      { home: 'SH', field: 237, date: '2026-11-22', start: '17:00', end: '18:30', note: 'Sân 5 Top Group, giao lưu nhẹ nhàng.' },
      { home: 'TX', others: ['FT'], field: 247, date: '2026-11-23', start: '19:30', end: '21:00', loser: 100, note: 'Thua trả hết tiền sân, ai tự tin thì vào.' },
      { home: 'LB', others: ['TB'], field: 322, date: '2026-11-25', start: '20:00', end: '21:30', loser: 60 },
      { home: 'TA', field: 194, date: '2026-11-27', start: '18:00', end: '19:30', note: 'Cần đối trung bình, đá tối thứ 6.' },
    ]) {
      await challenge(c, T, m);
    }

    // 4) Keo da chot doi, chua da
    for (const m of [
      { home: 'MD', away: 'TB', others: ['FT'], field: 146, date: '2026-11-24', start: '19:00', end: '20:30', loser: 60 },
      { home: 'GL', away: 'SH', field: 111, date: '2026-11-28', start: '08:00', end: '09:30' },
    ]) {
      await challenge(c, T, m);
    }

    // 5) Don dat le sap da
    for (const [userId, fieldId, date, start, end] of [
      [133, 238, '2026-11-20', '18:00', '19:30'],
      [136, 147, '2026-11-22', '07:00', '08:30'],
      [149, 323, '2026-11-26', '19:00', '20:30'],
      [141, 280, '2026-11-29', '16:00', '17:30'],
    ]) {
      await single(c, { userId, fieldId, date, start, end });
    }

    // 6) Hop dong dinh ky: dang chay (co buoi da da) va sap bat dau
    const contracts = [
      { userId: 1, fieldId: 399, weekdays: [2, 4], startDate: '2026-11-03', months: 1, start: '18:00', end: '19:30', note: 'Đội FC Bách Khoa tập cố định' },
      { userId: 127, fieldId: 489, weekdays: [6], startDate: '2026-11-07', months: 3, start: '07:00', end: '08:30', note: 'Sáng thứ 7 hằng tuần' },
      { userId: 226, fieldId: 522, weekdays: [3], startDate: '2026-11-25', months: 2, start: '20:00', end: '21:30' },
    ];
    for (const r of contracts) {
      const b = await recurring(c, r);
      console.log(`Dinh ky ${b.code}: ${b.sessions} buoi`);
    }

    // Don da qua het gio -> COMPLETED + cong so tran (giong job nen trong server.js)
    await c.query(
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
    await c.query(
      `UPDATE team t SET total_matches = t.wins + t.draws + t.losses WHERE t.id = ANY($1)`,
      [Object.values(T).map((t) => t.id)]
    );
  });
  console.log('Seed demo xong');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
