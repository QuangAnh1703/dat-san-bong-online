'use strict';
// Seed du lieu demo dot 2 de chup anh bao cao: phu het cac chuc nang (dat san, danh gia, cap keo, ghep chan le,
// chia tien, giai dau, vi hoi vien, POS, khieu nai, duyet chu san, thong bao) va doi ten cac tai khoan / doi
// test tu dong thanh ten that. Ngay thang tinh theo hom nay nen chay luc nao cung co tran sap da / da da.
// Chay tay sau seed-demo: node src/db/seed-report.js   (chi chay mot lan)
const { pool, withTransaction } = require('../db');
const { recordResult } = require('../services/tournament.service');
const { computeShares } = require('../services/split.service');
const { addTxn } = require('../services/wallet.service');
const { toMin, single, challenge, recurring, review, chat } = require('./seed-demo');

const MARKER = 'Cúp Tân Niên 2027';
const PASS_123456 = '$2a$10$RfoD37qCtvGRO0VN.fH1feViU.vYO4cMavSd/a7b5rpxUNoLdgUJy';
const ME = 159; // tai khoan nguoi choi chinh (doi FC giao luu)
const CG_OWNER_EMAIL = 'caugiay@gmail.com';

// PRNG co seed de moi lan chay ra cung bo du lieu
let seed = 20261123;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rand() * a.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const sample = (a, n) => [...a].sort(() => rand() - 0.5).slice(0, n);
const rnd = (n = 8) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[int(0, 31)]).join('');

const VN = 7 * 3600e3;
const day = (n) => new Date(Date.now() + VN + n * 86400e3).toISOString().slice(0, 10);
const ago = (hours) => new Date(Date.now() - hours * 3600e3);
const vnTime = (date, time) => new Date(`${date}T${time}:00+07:00`);
const addMin = (t, m) => {
  const x = toMin(t) + m;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

const NAMES = [
  'Nguyễn Minh Tuấn', 'Trần Quốc Huy', 'Lê Hoàng Nam', 'Phạm Đức Anh', 'Vũ Thành Long', 'Đặng Văn Hùng',
  'Bùi Tiến Dũng', 'Hoàng Gia Bảo', 'Ngô Quang Hải', 'Đỗ Mạnh Cường', 'Phan Văn Đức', 'Trịnh Xuân Trường',
  'Lý Công Phượng', 'Mai Tiến Thành', 'Dương Hồng Sơn', 'Hồ Tấn Tài', 'Nguyễn Hữu Thắng', 'Trần Đình Trọng',
  'Lương Xuân Trường', 'Nguyễn Văn Toàn', 'Phạm Xuân Mạnh', 'Đoàn Văn Hậu', 'Nguyễn Tiến Linh', 'Quế Ngọc Hải',
  'Vũ Văn Thanh', 'Nguyễn Thành Chung', 'Hà Đức Chinh', 'Trần Minh Vương', 'Lê Văn Xuân', 'Nguyễn Hoàng Đức',
  'Cao Văn Triền', 'Đinh Thanh Bình', 'Châu Ngọc Quang', 'Nguyễn Văn Quyết', 'Phạm Tuấn Hải', 'Bùi Hoàng Việt Anh',
  'Lê Phạm Thành Long', 'Trương Văn Thái Quý', 'Nguyễn Trọng Hoàng', 'Đỗ Duy Mạnh', 'Hoàng Văn Khánh', 'Tạ Thái Học',
  'Nguyễn Hai Long', 'Phan Tuấn Tài', 'Vũ Đình Hai', 'Lê Quang Vinh', 'Kiều Trọng Tuấn', 'Đào Duy Khánh',
  'Nguyễn Đức Chiến', 'Trần Văn Kiên', 'Hồ Văn Cường', 'Nguyễn Văn Vĩ', 'Lâm Ti Phông', 'Võ Minh Trọng',
  'Nguyễn Công Thành', 'Phạm Minh Phúc', 'Trần Bảo Toàn', 'Lê Minh Bình', 'Nguyễn Quang Nho', 'Đặng Anh Tuấn',
];
const TEAM_NAMES = [
  ['FC Cầu Giấy United', 'HN_CG'], ['FC Dịch Vọng', 'HN_CG'], ['FC Trung Hòa Stars', 'HN_CG'], ['FC Nghĩa Đô', 'HN_CG'],
  ['FC Mai Dịch Tigers', 'HN_CG'], ['FC Mễ Trì', 'HN_NTL'], ['FC Phú Đô', 'HN_NTL'], ['FC Đống Đa Warriors', 'HN_DD'],
  ['FC Láng Hạ', 'HN_DD'], ['FC Ba Đình Eagles', 'HN_BD'], ['FC Tây Hồ Lions', 'HN_TH'], ['FC Hoàng Mai', 'HN_HM'],
  ['FC Hai Bà Trưng', 'HN_HBT'], ['FC Hà Đông Phoenix', 'HN_HD'], ['FC Cổ Nhuế', 'HN_BTL'], ['FC Xuân Đỉnh', 'HN_BTL'],
  ['FC Khương Đình', 'HN_TX'], ['FC Nhân Chính', 'HN_TX'], ['FC Gia Lâm Kids', 'HN_LB'], ['FC Kim Mã', 'HN_BD'],
  ['FC Văn Phú', 'HN_HD'], ['FC Yên Hòa', 'HN_CG'],
];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'INTERMEDIATE', 'GOOD', 'GOOD', 'SEMI_PRO'];
const POS = ['GK', 'DF', 'MF', 'FW', 'ANY'];
const LEVEL_VI = { BEGINNER: 'mới chơi', INTERMEDIATE: 'trung bình', GOOD: 'khá', SEMI_PRO: 'phủi' };
const BIOS = [
  'Đá cánh phải, thích phối hợp nhanh.', 'Thủ môn phản xạ tốt, sẵn sàng đá tối các ngày trong tuần.',
  'Trung vệ chắc chắn, đá fair-play.', 'Tiền vệ trung tâm, chuyền dài ổn.', 'Đá vui là chính, không cay cú.',
  'Có thể đá mọi vị trí, rảnh cuối tuần.', null, null,
];
const REVIEWS = [
  [5, 5, 'Sân đẹp, cỏ mới, đèn sáng. Chủ sân thân thiện.'], [4, 5, 'Nhân viên nhiệt tình, có nước miễn phí.'],
  [5, 4, 'Mặt cỏ êm, khung thành chắc chắn.'], [4, 4, 'Giá hợp lý, gửi xe tiện.'], [3, 4, 'Cỏ hơi mòn ở góc sân, mong chủ sân thay sớm.'],
  [4, 3, 'Sân ổn nhưng nhà vệ sinh hơi xa.'], [5, 5, 'Đặt online nhanh, đến nơi có sân ngay. Sẽ quay lại!'],
  [4, 4, 'Ánh sáng tốt, đá tối rất thích.'], [3, 3, 'Hôm mưa sân hơi trơn.'], [5, 4, 'Vị trí dễ tìm, chỗ để xe rộng.'],
  [2, 3, 'Đèn một góc bị hỏng, đá hơi khó.'], [5, 5, null], [4, 5, null],
];
const REPLIES = [
  'Cảm ơn đội đã ủng hộ, hẹn gặp lại các bạn!', 'Sân đã ghi nhận và sẽ khắc phục trong tuần này. Cảm ơn góp ý của bạn.',
  'Cảm ơn bạn! Thứ 3 hằng tuần sân có ưu đãi 10%, mời đội ghé.', 'Xin lỗi vì trải nghiệm chưa tốt, lần tới sân xin tặng nước cho cả đội.',
];
const TIMES = ['06:00', '07:30', '16:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

const skipped = [];
async function attempt(c, label, fn) {
  await c.query('SAVEPOINT sp');
  try {
    const r = await fn();
    await c.query('RELEASE SAVEPOINT sp');
    return r;
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT sp');
    skipped.push(`${label}: ${e.message}`);
    return null;
  }
}

async function notify(c, userId, type, title, body, hoursAgo, isRead = false, refKind = null, refId = null) {
  await c.query(
    `INSERT INTO notification (user_id, type, title, body, ref_kind, ref_id, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, type, title, body, refKind, refId, isRead, ago(hoursAgo)]
  );
}

async function cancelBooking(c, b, status, reason, whenHoursAgo) {
  await c.query(
    `UPDATE booking SET status = $2, cancelled_at = $3, cancel_reason = $4, updated_at = $3 WHERE id = $1`,
    [b.id, status, ago(whenHoursAgo), reason]
  );
  await c.query(`UPDATE booking_slot SET status = 'RELEASED' WHERE booking_id = $1`, [b.id]);
}

// Khoa o san cho tran giai dau / khach vang lai (OWNER_LOCK)
async function lockSlot(c, { venueId, fieldId, date, start, end, reason = 'OTHER', note, guest = null }) {
  const b = await c.query(
    `INSERT INTO booking (code, kind, status, venue_id, total_amount, deposit_amount, lock_reason, note, guest_name,
                          guest_phone, confirmed_at, created_at, updated_at)
     VALUES ($1, 'OWNER_LOCK', 'CONFIRMED', $2, 0, 0, $3, $4, $5, $6, $7, $7, $7) RETURNING id, code`,
    [`TN${date.slice(2).replace(/-/g, '')}${rnd(5)}`, venueId, reason, note, guest?.name || null, guest?.phone || null,
      new Date(Math.min(vnTime(date, start).getTime() - 86400e3, Date.now()))]
  );
  const s = await c.query(
    `INSERT INTO booking_slot (booking_id, field_id, play_date, time_range, price, status)
     VALUES ($1, $2, $3::date, tstzrange(($3 || ' ' || $4)::timestamptz, ($3 || ' ' || $5)::timestamptz, '[)'), 0, 'LOCKED')
     RETURNING lower(time_range) AS starts_at`,
    [b.rows[0].id, fieldId, date, `${start}+07`, `${end}+07`]
  );
  return { id: b.rows[0].id, code: b.rows[0].code, startsAt: s.rows[0].starts_at };
}

async function main() {
  await withTransaction(async (c) => {
    const done = await c.query(`SELECT 1 FROM tournament WHERE name = $1`, [MARKER]);
    if (done.rowCount) throw new Error('Du lieu bao cao da duoc seed truoc do - dung lai');

    const owner = async (email) => (await c.query(`SELECT id FROM app_user WHERE lower(email) = $1`, [email])).rows[0]?.id;
    const CG = await owner(CG_OWNER_EMAIL);
    const ADMIN = (await c.query(`SELECT id FROM app_user WHERE role = 'ADMIN' ORDER BY (email = 'admin@gmail.com') DESC, id LIMIT 1`)).rows[0].id;
    const admins = (await c.query(`SELECT id FROM app_user WHERE role = 'ADMIN'`)).rows.map((r) => r.id);

    // ------------------------------------------------------------ 0) Doi ten tai khoan / doi / giai test
    const keep = [1, 2, 3, 127, ME, 226];
    const junk = (
      await c.query(`SELECT id FROM app_user WHERE role = 'PLAYER' AND id <> ALL($1) ORDER BY id`, [keep])
    ).rows.map((r) => r.id);
    const districts = (await c.query(`SELECT code FROM district`)).rows.map((r) => r.code);
    for (const [i, id] of junk.entries()) {
      await c.query(
        `INSERT INTO user_profile (user_id, full_name, district_code, skill_level, preferred_position, reputation_score, bio)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, district_code = EXCLUDED.district_code,
           skill_level = EXCLUDED.skill_level, preferred_position = EXCLUDED.preferred_position,
           reputation_score = EXCLUDED.reputation_score, bio = EXCLUDED.bio, updated_at = now()`,
        [id, NAMES[i % NAMES.length], i % 3 === 0 ? 'HN_CG' : pick(districts), pick(LEVELS), pick(POS), int(78, 100), pick(BIOS)]
      );
    }
    await c.query(`UPDATE app_user SET status = 'ACTIVE' WHERE id = ANY($1) AND status = 'PENDING_VERIFY'`, [junk]);
    // Tai khoan nguoi choi demo dang nhap duoc: player1@example.com / 123456
    await c.query(`UPDATE app_user SET password_hash = $1 WHERE lower(email) = 'player1@example.com'`, [PASS_123456]);
    await c.query(`UPDATE user_profile SET bio = 'Đội trưởng FC Bách Khoa, đá tối thứ 3 - 5 hằng tuần.', preferred_position = 'DF' WHERE user_id = 1`);

    const oldTeams = (await c.query(`SELECT id FROM team WHERE id <> ALL($1) ORDER BY id`, [[1, 2, 120, 144, 145, 146]])).rows;
    for (const [i, t] of oldTeams.entries()) {
      const [name, d] = TEAM_NAMES[i % TEAM_NAMES.length];
      await c.query(`UPDATE team SET name = $2, district_code = $3, skill_level = $4 WHERE id = $1`, [t.id, name, d, pick(LEVELS.slice(1))]);
    }
    // Moi doi co 6-9 thanh vien de danh sach doi / chia tien day du
    const players = (await c.query(`SELECT id FROM app_user WHERE role = 'PLAYER' ORDER BY id`)).rows.map((r) => r.id);
    const teamRows = (await c.query(`SELECT id, captain_id FROM team ORDER BY id`)).rows;
    for (const t of teamRows) {
      const have = (await c.query(`SELECT count(*)::int AS n FROM team_member WHERE team_id = $1`, [t.id])).rows[0].n;
      for (const u of sample(players.filter((p) => p !== t.captain_id), Math.max(0, int(6, 9) - have))) {
        await c.query(`INSERT INTO team_member (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [t.id, u]);
      }
      await c.query(`UPDATE team SET member_count = GREATEST(member_count, (SELECT count(*) FROM team_member WHERE team_id = $1) + 4) WHERE id = $1`, [t.id]);
    }

    // San test cu: 239 -> cum san bi dinh chi (co vi hoi vien dong bang), 240 -> cum san cho duyet
    const testOwner = (await c.query(`SELECT owner_id FROM venue WHERE id = 239`)).rows[0]?.owner_id;
    if (testOwner) {
      await c.query(`UPDATE user_profile SET full_name = 'Nguyễn Văn Phúc', district_code = 'HN_BTL' WHERE user_id = $1`, [testOwner]);
      await c.query(
        `UPDATE venue SET name = 'Sân bóng Cổ Nhuế Xanh', address = 'Ngõ 30 Cổ Nhuế, Cổ Nhuế 2, Bắc Từ Liêm', status = 'SUSPENDED',
                description = 'Sân cỏ nhân tạo 2 sân 7 người, đang tạm ngừng hoạt động để kiểm tra.' WHERE id = 239`
      );
      await c.query(
        `UPDATE venue SET name = 'Sân bóng Phú Diễn', address = 'Số 8 Phú Diễn, Bắc Từ Liêm', phone = '0912668899',
                description = 'Cụm sân mới 3 sân 5 người, có đèn LED và căng-tin.' WHERE id = 240`
      );
      await c.query(`INSERT INTO venue_approval (venue_id, admin_id, action, reason) VALUES (239, $1, 'SUSPEND', 'Nhiều khiếu nại về chất lượng sân, tạm dừng để kiểm tra')`, [ADMIN]);
    }

    // ------------------------------------------------------------ Doi bong & tran cap keo da da (bang xep hang Elo)
    const loadTeams = async () => {
      const r = await c.query(
        `SELECT t.id, t.name, t.captain_id, t.skill_level, t.district_code,
                COALESCE(array_agg(tm.user_id) FILTER (WHERE tm.user_id <> t.captain_id), '{}') AS members
           FROM team t LEFT JOIN team_member tm ON tm.team_id = t.id GROUP BY t.id ORDER BY t.id`
      );
      const T = {};
      for (const t of r.rows) {
        T[t.id] = { id: t.id, name: t.name, captain: t.captain_id, members: t.members.map(Number).slice(0, 5),
          level: t.skill_level, levelVi: LEVEL_VI[t.skill_level], district: t.district_code };
      }
      return T;
    };
    const T = await loadTeams();
    const teamIds = Object.keys(T).map(Number);
    const fields = (
      await c.query(
        `SELECT f.id, f.venue_id, v.district_code, v.owner_id FROM field f JOIN venue v ON v.id = f.venue_id
          WHERE v.status = 'APPROVED' AND f.is_active ORDER BY f.id`
      )
    ).rows;
    const cgVenues = (await c.query(`SELECT id FROM venue WHERE owner_id = $1 AND status = 'APPROVED' ORDER BY id`, [CG])).rows.map((r) => r.id);
    const cgFields = fields.filter((f) => cgVenues.includes(f.venue_id));
    const fieldNear = (teamId) => {
      const d = T[teamId].district;
      const local = fields.filter((f) => f.district_code === d);
      return pick(local.length && rand() < 0.8 ? local : fields);
    };

    let playedCount = 0;
    for (let k = 34; k >= 2; k--) {
      for (let n = 0; n < (k % 3 === 0 ? 2 : 1); n++) {
        const [home, away] = sample(teamIds, 2);
        const others = sample(teamIds.filter((t) => t !== home && t !== away), int(0, 2));
        const f = fieldNear(home);
        const start = pick(TIMES.slice(3));
        const m = { home, away, others, field: f.id, date: day(-k), start, end: addMin(start, 90), loser: pick([50, 60, 70, 100]) };
        const ok = await attempt(c, `keo da da ${m.date}`, async () => {
          const b = await challenge(c, T, m);
          const strength = (t) => ({ BEGINNER: 1, INTERMEDIATE: 2, GOOD: 3, SEMI_PRO: 4 })[T[t].level] || 2;
          const hs = Math.max(0, int(0, 3) + strength(home) - 2);
          const as = Math.max(0, int(0, 3) + strength(away) - 2);
          await recordResult(c, b.code, { id: f.owner_id, role: 'OWNER' }, hs, as);
          if (rand() < 0.5) await review(c, b, T[home].captain, ...pick(REVIEWS));
          return b;
        });
        if (ok) playedCount++;
      }
    }

    // ------------------------------------------------------------ Don dat cua chu san Cau Giay (lich, doanh thu, danh gia)
    let cgCount = 0;
    const cgBookings = [];
    for (let k = -30; k <= 7; k++) {
      const perDay = k < 0 ? int(3, 6) : int(2, 5);
      for (let n = 0; n < perDay; n++) {
        const f = pick(cgFields);
        const start = pick(TIMES);
        const date = day(k);
        const userId = pick(players);
        const b = await attempt(c, `don CG ${date}`, () => single(c, { userId, fieldId: f.id, date, start, end: addMin(start, 90), payFull: rand() < 0.3 }));
        if (!b) continue;
        cgCount++;
        if (rand() < 0.08) {
          await cancelBooking(c, b, k < 0 ? 'CANCELLED_BY_USER' : pick(['CANCELLED_BY_USER', 'CANCELLED_BY_OWNER']),
            pick(['Đội không đủ người', 'Trời mưa to', 'Đổi lịch sang tuần sau', 'Sân bảo trì đột xuất']), Math.max(2, -k * 24 + 30));
        } else cgBookings.push({ b, k, userId });
      }
      // Khach vang lai goi dien, chu san khoa o
      if (rand() < 0.35) {
        const f = pick(cgFields);
        const start = pick(TIMES);
        await attempt(c, 'walk-in', () =>
          lockSlot(c, { venueId: f.venue_id, fieldId: f.id, date: day(k), start, end: addMin(start, 90), reason: 'WALK_IN',
            note: 'Khách gọi điện đặt', guest: { name: pick(NAMES), phone: `09${int(10000000, 99999999)}` } })
        );
      }
    }
    if (cgFields.length) {
      const f = cgFields[0];
      await attempt(c, 'bao tri', () => lockSlot(c, { venueId: f.venue_id, fieldId: f.id, date: day(2), start: '06:00', end: '09:00', reason: 'MAINTENANCE', note: 'Thay lưới khung thành, vệ sinh mặt cỏ' }));
    }
    // Danh gia cho don da da, mot nua co chu san tra loi
    for (const { b, k, userId } of cgBookings) {
      if (k >= 0 || rand() > 0.45) continue;
      await review(c, b, userId, ...pick(REVIEWS));
      if (rand() < 0.5) {
        await c.query(`UPDATE review SET owner_reply = $2, replied_at = now() - interval '1 day' WHERE booking_id = $1`, [b.id, pick(REPLIES)]);
      }
    }

    // Don dat o cac quan khac (bao cao admin theo cum san)
    for (let k = -30; k <= 5; k++) {
      for (let n = 0; n < 2; n++) {
        const f = pick(fields.filter((x) => !cgVenues.includes(x.venue_id)));
        const start = pick(TIMES);
        const userId = pick(players);
        const b = await attempt(c, 'don quan khac', () => single(c, { userId, fieldId: f.id, date: day(k), start, end: addMin(start, 90) }));
        if (b && k < 0 && rand() < 0.3) await review(c, b, userId, ...pick(REVIEWS));
      }
    }

    // ------------------------------------------------------------ Lich cua toi (tai khoan chinh + player1)
    const myTeam = (await c.query(`SELECT id FROM team WHERE captain_id = $1`, [ME])).rows[0]?.id || null;
    const mine = [];
    for (const [uid, team] of [[ME, myTeam], [1, 1]]) {
      for (const [k, start, rate] of [[-12, '19:00', REVIEWS[0]], [-6, '18:30', REVIEWS[6]], [-3, '20:00', null], [1, '19:30'], [3, '18:00'], [6, '20:00'], [9, '07:30']]) {
        const f = pick(cgFields);
        const b = await attempt(c, `lich cua toi ${uid}`, () => single(c, { userId: uid, teamId: team, fieldId: f.id, date: day(k), start, end: addMin(start, 90) }));
        if (!b) continue;
        mine.push({ uid, b, k });
        if (rate) await review(c, b, uid, ...rate);
      }
      const f = pick(cgFields);
      const cb = await attempt(c, 'don huy', () => single(c, { userId: uid, fieldId: f.id, date: day(4), start: '17:00', end: '18:30' }));
      if (cb) await cancelBooking(c, cb, 'CANCELLED_BY_USER', 'Đội trùng lịch thi đấu khác', 20);
      await attempt(c, 'dinh ky', () =>
        recurring(c, { userId: uid, fieldId: pick(cgFields).id, weekdays: [uid === ME ? 3 : 5], startDate: day(-15), months: 2,
          start: '19:00', end: '20:30', note: 'Lịch đá cố định của đội' })
      );
    }

    // ------------------------------------------------------------ Cap keo: keo dang mo + keo da chot sap da
    let openCount = 0;
    const openPlans = [
      { home: myTeam, others: sample(teamIds, 3) }, { home: 1, others: sample(teamIds, 2) }, { home: pick(teamIds), others: [myTeam] },
      ...Array.from({ length: 9 }, () => ({ home: pick(teamIds), others: sample(teamIds, int(0, 2)) })),
    ];
    for (const [i, p] of openPlans.entries()) {
      if (!p.home) continue;
      const start = pick(TIMES.slice(4));
      const m = { home: p.home, others: p.others.filter((t) => t && t !== p.home), field: fieldNear(p.home).id, date: day(1 + (i % 9)), start,
        end: addMin(start, 90), loser: pick([50, 60, 70, 100]),
        note: pick(['Tìm đối trình độ tương đương, đá vui vẻ.', 'Đội đã có sân, cần đối cứng.', 'Giao lưu nhẹ nhàng, không cay cú.', '']) };
      if (await attempt(c, 'keo mo', () => challenge(c, T, m))) openCount++;
    }
    for (let i = 0; i < 4; i++) {
      const [home, away] = i === 0 && myTeam ? [myTeam, pick(teamIds.filter((t) => t !== myTeam))] : sample(teamIds, 2);
      const start = pick(TIMES.slice(4));
      await attempt(c, 'keo chot', () => challenge(c, T, { home, away, others: sample(teamIds.filter((t) => t !== home && t !== away), 1),
        field: fieldNear(home).id, date: day(2 + i * 2), start, end: addMin(start, 90), loser: 70 }));
    }

    // ------------------------------------------------------------ Ghep chan le: doi tim nguoi + nguoi tim doi
    let recruitCount = 0;
    for (let i = 0; i < 9; i++) {
      const teamId = i === 0 && myTeam ? myTeam : pick(teamIds);
      const t = T[teamId];
      const f = fieldNear(teamId);
      const start = pick(TIMES.slice(4));
      const date = day(1 + (i % 6));
      await attempt(c, 'tuyen chan le', async () => {
        const b = await single(c, { userId: t.captain, teamId, fieldId: f.id, date, start, end: addMin(start, 90) });
        const need = int(2, 4);
        const filled = int(0, need - 1);
        const cost = pick(['FREE', 'FIXED', 'FIXED', 'VOLUNTARY']);
        const post = (
          await c.query(
            `INSERT INTO match_post (type, booking_id, author_user_id, team_id, district_code, play_date, time_span, required_level,
                                     slots_needed, slots_filled, cost_kind, cost_amount, positions, content, expires_at, created_at)
             VALUES ('TEAM_FINDS_PLAYER', $1, $2, $3, $4, $5, int4range($6, $7), $8, $9, $10, $11, $12, $13::position_type[], $14, $15, $16)
             RETURNING id`,
            [b.id, t.captain, teamId, f.district_code, date, toMin(start), toMin(addMin(start, 90)), t.level, need, filled, cost,
              cost === 'FIXED' ? pick([40000, 50000, 60000]) : null, sample(['GK', 'DF', 'MF', 'FW'], int(1, 2)),
              pick(['Thiếu thủ môn, ai bắt được thì vào nhé!', 'Cần thêm người đá cánh, trình trung bình.', 'Đá vui vẻ, có nước uống miễn phí.', 'Đội thiếu người phút chót, cứu với!']),
              vnTime(date, start), ago(int(3, 30))]
          )
        ).rows[0].id;
        const cands = sample(players.filter((p) => p !== t.captain && !t.members.includes(p)), filled + int(1, 2));
        for (const [j, u] of cands.entries()) {
          const accepted = j < filled;
          await c.query(
            `INSERT INTO join_request (post_id, requester_user_id, message, status, responded_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [post, u, pick(['Em đá được tiền vệ, cho em xin 1 slot.', 'Mình bắt gôn ổn, còn chỗ không bạn?', 'Cho mình tham gia với!']),
              accepted ? 'ACCEPTED' : 'PENDING', accepted ? ago(2) : null, ago(int(2, 12))]
          );
          if (accepted) {
            await c.query(`INSERT INTO match_participant (booking_id, user_id, source, position) VALUES ($1, $2, 'FREELANCE', $3) ON CONFLICT DO NOTHING`, [b.id, u, pick(POS)]);
          }
        }
        if (filled > 0) {
          await chat(c, b.id, post, [t.captain, ...cands.slice(0, filled)], [
            [t.captain, `Chào các bạn, trận ${start} ngày ${date.slice(8)}/${date.slice(5, 7)} tại sân nhé.`],
            [cands[0], 'Ok anh, em sẽ có mặt sớm 15 phút.'],
            [t.captain, 'Đội mặc áo đỏ, các bạn mang áo tối màu nhé.'],
          ], ago(3));
        }
        recruitCount++;
      });
    }
    let playerPostCount = 0;
    for (let i = 0; i < 10; i++) {
      const u = i === 0 ? 226 : pick(players);
      const prof = (await c.query(`SELECT skill_level, preferred_position, district_code FROM user_profile WHERE user_id = $1`, [u])).rows[0];
      if (!prof) continue;
      const ds = [...new Set([prof.district_code || 'HN_CG', ...sample(districts, int(0, 2))])];
      const date = day(1 + (i % 7));
      const from = pick(['17:00', '18:00', '19:00']);
      const p = (
        await c.query(
          `INSERT INTO match_post (type, author_user_id, district_code, district_codes, play_date, time_span, required_level, positions, content, expires_at, created_at)
           VALUES ('PLAYER_FINDS_TEAM', $1, $2, $3::varchar[], $4, int4range($5, $6), $7, $8::position_type[], $9, $10, $11) RETURNING id`,
          [u, ds[0], ds, date, toMin(from), toMin(from) + 180, prof.skill_level, [prof.preferred_position],
            pick(['Rảnh tối nay, cần đội đá ghép.', 'Mình đá tiền đạo, tìm đội đá giao lưu cuối tuần.', 'Thủ môn tìm đội, đá được sân 7.', 'Mới chuyển về Hà Nội, muốn tìm đội đá cố định.']),
            vnTime(date, addMin(from, 180)), ago(int(1, 20))]
        )
      ).rows[0].id;
      playerPostCount++;
      // Doi truong gui loi moi kem tran da dat
      const inv = mine.find((x) => x.uid === ME && x.k > 0);
      if (i < 3 && inv) {
        await attempt(c, 'loi moi', () => c.query(
          `INSERT INTO join_request (post_id, requester_user_id, requester_team_id, message, status, kind, booking_id, expires_at, created_at)
           VALUES ($1, $2, $3, 'Đội mình đang thiếu người, mời bạn vào đá cùng!', 'PENDING', 'INVITE', $4, $5, $6)`,
          [p, ME, myTeam, inv.b.id, vnTime(date, from), ago(1)]
        ));
      }
    }

    // ------------------------------------------------------------ So quy & chia tien tran
    const phoneOf = async (ids) =>
      (await c.query(`SELECT u.id, u.phone, p.full_name FROM app_user u JOIN user_profile p ON p.user_id = u.id WHERE u.id = ANY($1) AND u.phone IS NOT NULL`, [ids])).rows;
    let splitCount = 0;
    for (const x of mine) {
      if (!(x.k === -6 || x.k === 1 || x.k === 3)) continue;
      const team = x.uid === ME ? myTeam : 1;
      if (!team) continue;
      const mem = await phoneOf((await c.query(`SELECT user_id FROM team_member WHERE team_id = $1`, [team])).rows.map((r) => r.user_id));
      const capName = (await c.query(`SELECT full_name FROM user_profile WHERE user_id = $1`, [x.uid])).rows[0].full_name;
      const members = [{ id: x.uid, name: capName, phone: x.uid === ME ? '0912345159' : '0977000001' }, ...mem.filter((m) => m.id !== x.uid).slice(0, 8).map((m) => ({ id: m.id, name: m.full_name, phone: m.phone }))];
      const mode = x.k === 3 ? 'SPONSOR' : 'EQUAL';
      const sponsorPercent = mode === 'SPONSOR' ? 20 : 0;
      const total = Number((await c.query(`SELECT total_amount FROM booking WHERE id = $1`, [x.b.id])).rows[0].total_amount);
      const { amounts, sponsor, surplus } = computeShares({ mode, total, sponsorPercent, members });
      const doneBill = x.k < 0;
      const bill = (
        await c.query(
          `INSERT INTO split_bill (booking_id, team_id, captain_id, mode, sponsor_percent, total_amount, sponsor_amount, surplus,
                                   bank_name, bank_account, bank_holder, due_at, status, completed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Vietcombank', '1023456789', $9, $10, $11, $12, $13) RETURNING id`,
          [x.b.id, team, x.uid, mode, sponsorPercent, total, sponsor, surplus, capName.toUpperCase(),
            doneBill ? ago(24 * 6 + 20) : new Date(Math.max(Date.now() + 6 * 3600e3, vnTime(day(x.k), '17:00').getTime())),
            doneBill ? 'DONE' : 'OPEN', doneBill ? ago(24 * 6) : null, ago(doneBill ? 24 * 7 : 20)]
        )
      ).rows[0].id;
      for (const [i, m] of members.entries()) {
        const paidShare = i === 0 || doneBill || rand() < 0.5;
        await c.query(
          `INSERT INTO split_bill_share (split_bill_id, user_id, name, phone, amount, status, paid_at, reminded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [bill, m.id, m.name, m.phone, amounts[i], paidShare ? (i > 0 && rand() < 0.15 ? 'PAID_BY_CAPTAIN' : 'PAID') : 'UNPAID',
            paidShare ? ago(int(2, 18)) : null, !paidShare && rand() < 0.5 ? ago(3) : null]
        );
        if (!paidShare && m.id) await notify(c, m.id, 'SPLIT_REQUEST', `Đóng ${amounts[i].toLocaleString('vi-VN')}đ tiền trận ${x.b.code}`, 'Mở sổ quỹ trận để quét VietQR.', 10, false, 'BOOKING', x.b.id);
      }
      splitCount++;
    }
    // Lich su quy doi
    for (const team of [myTeam, 1].filter(Boolean)) {
      let bal = Number((await c.query(`SELECT fund_balance FROM team WHERE id = $1`, [team])).rows[0].fund_balance);
      for (const [delta, reason, d] of [
        [600000, 'Thu quỹ tháng 10 (12 người × 50.000đ)', 40], [-250000, 'Mua 2 quả bóng Động Lực UHV 2.07', 33],
        [-120000, 'Nước uống trận giao hữu', 21], [550000, 'Thu quỹ tháng 11 (11 người × 50.000đ)', 10],
        [-180000, 'In số áo cho thành viên mới', 4],
      ]) {
        bal += delta;
        await c.query(`INSERT INTO team_fund_log (team_id, delta, reason, balance_after, created_at) VALUES ($1, $2, $3, $4, $5)`, [team, delta, reason, bal, ago(24 * d)]);
      }
      await c.query(`UPDATE team SET fund_balance = $2 WHERE id = $1`, [team, bal]);
    }
    // Tai khoan chinh cung dang no tien mot tran da ghep cung FC Bach Khoa (muc "Cần đóng tiền")
    await c.query(
      `INSERT INTO split_bill_share (split_bill_id, user_id, name, phone, amount, status)
       SELECT sb.id, $1, p.full_name, '0912345159', (SELECT max(amount) FROM split_bill_share WHERE split_bill_id = sb.id), 'UNPAID'
         FROM split_bill sb JOIN user_profile p ON p.user_id = $1
        WHERE sb.captain_id = 1 AND sb.status = 'OPEN' ORDER BY sb.id DESC LIMIT 1`,
      [ME]
    );

    // ------------------------------------------------------------ Giai dau (chu san Cau Giay to chuc)
    await c.query(`UPDATE tournament SET organizer_id = $1 WHERE venue_id = ANY($2)`, [CG, cgVenues]);
    await c.query(`UPDATE tournament SET name = 'Cúp Giao Hữu Tháng 10', description = 'Giải giao hữu 4 đội sân 7, đá vòng tròn một lượt.' WHERE name LIKE 'Cúp test %'`);
    await c.query(`UPDATE tournament SET name = 'Cúp Tứ Hùng Cầu Giấy', status = 'CANCELLED', description = 'Giải bị hủy do không đủ đội đăng ký.' WHERE name LIKE 'Cúp 2 %'`);
    const venueField = async (venueId, type) =>
      (await c.query(`SELECT id FROM field WHERE venue_id = $1 AND type = $2 AND is_active ORDER BY id LIMIT 1`, [venueId, type])).rows[0]?.id;
    const mkTournament = async ({ venueId, fieldId, name, description, format, max, fee, deadline, start, status, created }) =>
      (
        await c.query(
          `INSERT INTO tournament (venue_id, field_id, organizer_id, name, description, format, max_teams, fee, registration_deadline,
                                   start_date, daily_start_minute, daily_end_minute, match_minutes, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1080, 1320, 90, $11, $12) RETURNING id`,
          [venueId, fieldId, CG, name, description, format, max, fee, deadline, start, status, created]
        )
      ).rows[0].id;
    const register = async (tid, teams, paidHoursAgo, group = null, pending = []) => {
      for (const t of teams) {
        await c.query(
          `INSERT INTO tournament_team (tournament_id, team_id, fee_code, status, group_label, paid_at, created_at)
           VALUES ($1, $2, $3, 'REGISTERED', $4, $5, $5)`,
          [tid, t, `GI${rnd(9)}`, group, ago(paidHoursAgo)]
        );
      }
      for (const t of pending) {
        await c.query(`INSERT INTO tournament_team (tournament_id, team_id, fee_code, status, created_at) VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4)`, [tid, t, `GI${rnd(9)}`, ago(20)]);
      }
    };
    const tMatch = async (tid, tname, venueId, fieldId, round, home, away, date, start, score) => {
      const lk = await lockSlot(c, { venueId, fieldId, date, start, end: addMin(start, 90), note: `Giải ${tname} · ${T[home].name} vs ${T[away].name}` });
      await c.query(
        `INSERT INTO tournament_match (tournament_id, round, home_team_id, away_team_id, booking_id, starts_at, home_score, away_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tid, round, home, away, lk.id, lk.startsAt, score?.[0] ?? null, score?.[1] ?? null, score ? 'PLAYED' : 'SCHEDULED']
      );
    };
    const cgTeams = teamIds.filter((t) => T[t].district === 'HN_CG');
    const pool8 = [...new Set([...(myTeam ? [myTeam] : []), 1, ...cgTeams, ...teamIds])].slice(0, 12);

    await attempt(c, 'giai vong tron da xong', async () => {
      const v = cgVenues.find((id) => id !== 1) || cgVenues[0];
      const fId = (await venueField(v, 'F7')) || (await venueField(v, 'F5'));
      const name = 'Giải Phủi Cầu Giấy Cup 2026';
      const tid = await mkTournament({ venueId: v, fieldId: fId, name, format: 'ROUND_ROBIN', max: 4, fee: 1000000, status: 'FINISHED',
        description: 'Giải bóng đá phủi thường niên dành cho các đội quận Cầu Giấy. Đá vòng tròn 1 lượt, sân 7 người.',
        deadline: ago(24 * 25), start: day(-21), created: ago(24 * 40) });
      const teams = pool8.slice(0, 4);
      await register(tid, teams, 24 * 28);
      const pairs = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
      for (const [i, [a, b]] of pairs.entries()) {
        await tMatch(tid, name, v, fId, Math.floor(i / 2) + 1, teams[a], teams[b], day(-21 + Math.floor(i / 2) * 2), i % 2 ? '20:00' : '18:30', [int(0, 4), int(0, 3)]);
      }
    });
    await attempt(c, 'giai loai truc tiep dang dien ra', async () => {
      const fId = (await venueField(1, 'F7')) || cgFields[0].id;
      const name = 'Giải Vô Địch Sân 7 Mùa Đông 2026';
      const tid = await mkTournament({ venueId: 1, fieldId: fId, name, format: 'KNOCKOUT', max: 8, fee: 1500000, status: 'ONGOING',
        description: 'Giải loại trực tiếp 8 đội, tổng giải thưởng 10.000.000đ cùng cúp và huy chương cho đội vô địch.',
        deadline: ago(24 * 8), start: day(-5), created: ago(24 * 25) });
      const teams = pool8.slice(1, 9);
      await register(tid, teams, 24 * 12);
      const winners = [];
      for (let i = 0; i < 8; i += 2) {
        const s = [int(0, 4), int(0, 4)];
        if (s[0] === s[1]) s[0]++;
        await tMatch(tid, name, 1, fId, 1, teams[i], teams[i + 1], day(-5 + Math.floor(i / 4)), i % 4 ? '20:00' : '18:30', s);
        winners.push(s[0] > s[1] ? teams[i] : teams[i + 1]);
      }
      await tMatch(tid, name, 1, fId, 2, winners[0], winners[1], day(2), '18:30', null);
      await tMatch(tid, name, 1, fId, 2, winners[2], winners[3], day(2), '20:00', null);
      for (const t of teams) await notify(c, T[t].captain, 'TOURNAMENT_SCHEDULE', `Giải ${name}: đã xếp vòng 2`, 'Xem lịch thi đấu trong trang giải.', 30, true);
    });
    await attempt(c, 'giai dang mo dang ky', async () => {
      const fId = (await venueField(1, 'F7')) || cgFields[0].id;
      const tid = await mkTournament({ venueId: 1, fieldId: fId, name: MARKER, format: 'ROUND_ROBIN', max: 8, fee: 1200000, status: 'OPEN',
        description: 'Giải giao hữu đón năm mới 2027, chia 2 bảng đá vòng tròn. Lệ phí gồm tiền sân, trọng tài, nước uống.',
        deadline: vnTime(day(10), '23:00'), start: day(14), created: ago(24 * 5) });
      await register(tid, pool8.slice(0, 5), 24 * 2, null, pool8.slice(5, 7));
    });
    const tOpen2 = await attempt(c, 'giai knockout sap mo', async () => {
      const v = cgVenues[2] || cgVenues[0];
      const fId = (await venueField(v, 'F5')) || (await venueField(v, 'F7'));
      const tid = await mkTournament({ venueId: v, fieldId: fId, name: 'Cúp Sinh Viên Cầu Giấy 2026', format: 'KNOCKOUT', max: 16, fee: 600000, status: 'OPEN',
        description: 'Dành cho các đội sinh viên trên địa bàn Cầu Giấy, sân 5 người.', deadline: vnTime(day(6), '22:00'), start: day(8), created: ago(24 * 3) });
      await register(tid, pool8.slice(6, 9), 24, null, pool8.slice(9, 11));
      return tid;
    });

    // ------------------------------------------------------------ Vi hoi vien
    await c.query(`UPDATE membership_plan SET name = 'Gói Vàng' WHERE id = (SELECT min(id) FROM membership_plan WHERE name LIKE 'Gold %')`);
    await c.query(`UPDATE membership_plan SET name = 'Gói Bạc', price = 200000, bonus = 20000, discount_percent = 3 WHERE name LIKE 'Gold %'`);
    const plans = [];
    for (const [venueId, name, price, bonus, disc] of [
      [1, 'Gói Kim Cương', 1000000, 200000, 10], [cgVenues[1], 'Gói Thành Viên', 500000, 60000, 5], [cgVenues[1], 'Gói VIP Cả Đội', 2000000, 500000, 12],
      [cgVenues[2], 'Gói Sinh Viên', 300000, 30000, 5],
    ]) {
      if (!venueId) continue;
      plans.push((await c.query(`INSERT INTO membership_plan (venue_id, name, price, bonus, discount_percent, created_at) VALUES ($1, $2, $3, $4, $5, now() - interval '30 days') RETURNING id, venue_id, price, bonus, name`, [venueId, name, price, bonus, disc])).rows[0]);
    }
    const allPlans = (await c.query(`SELECT id, venue_id, price, bonus, name FROM membership_plan WHERE venue_id = ANY($1)`, [cgVenues])).rows;
    let walletCount = 0;
    const openWallet = async (userId, plan, status = 'ACTIVE', spend = true) => {
      const w = await c.query(
        `INSERT INTO member_wallet (user_id, venue_id, plan_id, balance, status, created_at) VALUES ($1, $2, $3, 0, 'ACTIVE', $4)
         ON CONFLICT DO NOTHING RETURNING id`,
        [userId, plan.venue_id, plan.id, ago(24 * int(10, 30))]
      );
      if (!w.rowCount) return;
      const wid = w.rows[0].id;
      await c.query(`INSERT INTO wallet_topup (code, user_id, venue_id, plan_id, amount, status, paid_at, created_at) VALUES ($1, $2, $3, $4, $5, 'PAID', $6, $6)`,
        [`NV${rnd(8)}`, userId, plan.venue_id, plan.id, plan.price, ago(24 * 9)]);
      await addTxn(c, wid, 'TOPUP', Number(plan.price), { note: `Nạp ${plan.name}` });
      if (Number(plan.bonus) > 0) await addTxn(c, wid, 'BONUS', Number(plan.bonus), { note: `Thưởng ${plan.name}` });
      if (spend) {
        for (let i = 0; i < int(1, 3); i++) {
          const amt = pick([180000, 240000, 300000]);
          const bal = Number((await c.query(`SELECT balance FROM member_wallet WHERE id = $1`, [wid])).rows[0].balance);
          if (bal >= amt) await addTxn(c, wid, 'PAY', -amt, { note: 'Thanh toán tiền sân' });
        }
      }
      await c.query(`UPDATE wallet_txn SET created_at = now() - (random() * interval '9 days') WHERE wallet_id = $1`, [wid]);
      if (status !== 'ACTIVE') await c.query(`UPDATE member_wallet SET status = $2 WHERE id = $1`, [wid, status]);
      walletCount++;
    };
    for (const u of [ME, 1, ...sample(players, 10)]) await attempt(c, 'vi hoi vien', () => openWallet(u, pick(allPlans)));
    // Vi dong bang o cum san bi dinh chi
    if (testOwner) {
      const fp = (await c.query(`INSERT INTO membership_plan (venue_id, name, price, bonus, discount_percent) VALUES (239, 'Gói Thành Viên', 500000, 50000, 5) RETURNING id, venue_id, price, bonus, name`)).rows[0];
      for (const u of sample(players, 5)) await attempt(c, 'vi dong bang', () => openWallet(u, fp, 'FROZEN', rand() < 0.5));
      for (const a of admins) await notify(c, a, 'WALLET_FROZEN_ADMIN', '5 ví hội viên bị đóng băng', 'Cụm sân Sân bóng Cổ Nhuế Xanh bị đình chỉ, cần hoàn trả tiền đọng cho người chơi.', 26);
    }

    // ------------------------------------------------------------ Can-tin POS cua chu san Cau Giay
    let posCount = 0;
    for (const venueId of cgVenues.slice(0, 6)) {
      const svc = (await c.query(`SELECT id, name, category, price FROM venue_service WHERE venue_id = $1 AND is_active`, [venueId])).rows;
      if (!svc.length) continue;
      for (let k = 14; k >= 0; k--) {
        for (let n = 0; n < int(1, 4); n++) {
          const items = sample(svc, int(1, 3)).map((s) => ({ ...s, q: s.category === 'DRINK' ? int(2, 12) : 1 }));
          const total = items.reduce((s, x) => s + Number(x.price) * x.q, 0);
          const when = vnTime(day(-k), pick(['17:40', '18:50', '19:45', '20:30', '21:10']));
          if (when > new Date()) continue;
          const o = (await c.query(`INSERT INTO service_order (venue_id, created_by, pay_mode, total, paid_at, created_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
            [venueId, CG, pick(['CASH', 'CASH', 'QR']), total, when])).rows[0].id;
          for (const x of items) {
            await c.query(`INSERT INTO service_order_item (order_id, service_id, name, category, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)`, [o, x.id, x.name, x.category, x.price, x.q]);
          }
          posCount++;
        }
      }
      // Vai mat hang sap het de man kho hien canh bao
      await c.query(`UPDATE venue_service SET stock = $2 WHERE id = (SELECT id FROM venue_service WHERE venue_id = $1 AND category = 'DRINK' ORDER BY id LIMIT 1)`, [venueId, int(2, 5)]);
    }

    // ------------------------------------------------------------ Khieu nai
    const pastMine = mine.filter((x) => x.k < 0);
    const anyCg = cgBookings.filter((x) => x.k < 0);
    const tickets = [
      { reporter: ME, kind: 'BOOKING', b: pastMine[0]?.b, subject: 'Sân không bật đèn đúng giờ', status: 'NEED_INFO',
        content: 'Đội mình đặt 19:00 nhưng 19:15 sân mới bật đèn, mất 15 phút đá. Mong được hoàn một phần tiền.',
        msgs: [[ADMIN, 'Chào bạn, bạn vui lòng gửi thêm ảnh chụp hoặc video lúc sân chưa bật đèn để quản trị viên xác minh nhé.']], due: 48 },
      { reporter: ME, kind: 'TEAM', target: pick(teamIds.filter((t) => t !== myTeam)), subject: 'Đội bạn chơi xấu, cố tình gây chấn thương', status: 'IN_PROGRESS',
        content: 'Trong trận giao hữu, cầu thủ số 7 đội bạn liên tục vào bóng nguy hiểm, một thành viên đội mình bị bong gân.',
        msgs: [[ADMIN, 'Quản trị viên đã tiếp nhận, đang liên hệ đội trưởng đội bị phản ánh.'], [ME, 'Cảm ơn admin, đội mình có video trận đấu nếu cần.']] },
      { reporter: 1, kind: 'VENUE', target: 1, subject: 'Mặt cỏ bị bong tróc nhiều chỗ', status: 'RESOLVED',
        content: 'Sân 7A cỏ bong nhiều chỗ, dễ vấp ngã.', resolution: 'Chủ sân đã thay cỏ khu vực bị hỏng và tặng đội voucher giảm 20% lần đặt sau.',
        msgs: [[ADMIN, 'Đã chuyển phản ánh tới chủ sân.'], [1, 'Hôm nay đội mình quay lại thấy sân đã sửa, cảm ơn admin!']] },
      { reporter: pick(players), kind: 'BOOKING', b: anyCg[0]?.b, subject: 'Đã chuyển khoản nhưng đơn chưa xác nhận', status: 'NEW',
        content: 'Mình đã chuyển tiền cọc đúng nội dung nhưng 30 phút sau đơn vẫn chưa xác nhận.' },
      { reporter: pick(players), kind: 'USER', target: pick(players), subject: 'Người chơi nhận slot rồi không đến', status: 'NEW',
        content: 'Bạn này nhận slot ghép chân lẻ nhưng không đến, không báo trước, đội thiếu người.' },
      { reporter: pick(players), kind: 'VENUE', target: cgVenues[3] || 1, subject: 'Chủ sân thu thêm phí gửi xe', status: 'CLOSED',
        content: 'Sân ghi miễn phí gửi xe nhưng bảo vệ thu 10.000đ/xe.', resolution: 'Đã xác minh, chủ sân cam kết miễn phí gửi xe cho khách đặt qua SanBong.',
        msgs: [[ADMIN, 'Cảm ơn bạn đã phản ánh, chủ sân đã điều chỉnh.']] },
      { reporter: pick(players), kind: 'BOOKING', b: anyCg[1]?.b, subject: 'Bị hủy sân sát giờ đá', status: 'IN_PROGRESS',
        content: 'Chủ sân báo hủy trước giờ đá 1 tiếng vì có khách khác, đội mình không kịp tìm sân.',
        msgs: [[ADMIN, 'Quản trị viên đang làm việc với chủ sân về khoản bồi hoàn.']] },
    ];
    let ticketCount = 0;
    for (const [i, t] of tickets.entries()) {
      if (t.kind === 'BOOKING' && !t.b) continue;
      const created = ago(24 * (i + 1) + int(0, 10));
      const r = await c.query(
        `INSERT INTO complaint_ticket (code, reporter_id, target_kind, target_id, booking_id, subject, content, status,
                                       assigned_admin_id, resolution, info_due_at, created_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [`TK-${rnd(8)}`, t.reporter, t.kind, t.kind === 'BOOKING' ? t.b.id : t.target, t.kind === 'BOOKING' ? t.b.id : null, t.subject, t.content,
          t.status, t.status === 'NEW' ? null : ADMIN, t.resolution || null, t.due ? new Date(Date.now() + t.due * 3600e3) : null, created,
          ['RESOLVED', 'CLOSED'].includes(t.status) ? ago(12) : null]
      );
      let tm = created.getTime();
      for (const [author, content] of t.msgs || []) {
        tm += 3 * 3600e3;
        await c.query(`INSERT INTO complaint_message (ticket_id, author_id, content, created_at) VALUES ($1, $2, $3, $4)`, [r.rows[0].id, author, content, new Date(Math.min(tm, Date.now()))]);
      }
      if (t.status === 'NEED_INFO') await notify(c, t.reporter, 'COMPLAINT_NEED_INFO', `Khiếu nại "${t.subject}" cần bổ sung thông tin`, 'Quản trị viên cần thêm bằng chứng để xử lý.', 5, false, 'BOOKING', t.b?.id);
      if (t.status === 'RESOLVED') await notify(c, t.reporter, 'COMPLAINT_RESOLVED', `Khiếu nại "${t.subject}" đã được giải quyết`, t.resolution, 12, true);
      ticketCount++;
    }

    // ------------------------------------------------------------ Duyet chu san & cum san moi
    const reqUsers = sample(junk, 5);
    for (const [i, u] of reqUsers.entries()) {
      const rejected = i === 4;
      await c.query(
        `INSERT INTO owner_request (user_id, status, requested_at, reviewed_at, reviewed_by, rejection_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $3)`,
        [u, rejected ? 'REJECTED' : 'PENDING', ago(24 * (i + 1)), rejected ? ago(10) : null, rejected ? ADMIN : null,
          rejected ? 'Thông tin giấy phép kinh doanh chưa rõ ràng, vui lòng bổ sung.' : null]
      );
    }
    const newVenue = async (ownerEmail, name, address, district, status, reason) => {
      const o = await owner(ownerEmail);
      if (!o) return;
      const v = (
        await c.query(
          `INSERT INTO venue (owner_id, name, address, district_code, phone, description, status, bank_name, bank_account, bank_holder, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Techcombank', '19036688001', 'NGUYEN VAN NAM', $8) RETURNING id`,
          [o, name, address, district, `09${int(10000000, 99999999)}`, `${name} - sân cỏ nhân tạo mới xây, có đèn LED, căng-tin và chỗ để xe rộng.`, status, ago(30)]
        )
      ).rows[0].id;
      for (const [n, type] of [['Sân 5 - A', 'F5'], ['Sân 5 - B', 'F5'], ['Sân 7 - C', 'F7']]) {
        await c.query(`INSERT INTO field (venue_id, name, type) VALUES ($1, $2, $3)`, [v, n, type]);
      }
      await c.query(`INSERT INTO venue_amenity (venue_id, amenity_code) SELECT $1, code FROM amenity ORDER BY code LIMIT 4`, [v]);
      await c.query(`INSERT INTO venue_approval (venue_id, admin_id, action, reason, created_at) VALUES ($1, NULL, 'SUBMIT', NULL, $2)`, [v, ago(30)]);
      if (reason) await c.query(`INSERT INTO venue_approval (venue_id, admin_id, action, reason, created_at) VALUES ($1, $2, 'REJECT', $3, $4)`, [v, ADMIN, reason, ago(8)]);
    };
    await newVenue(CG_OWNER_EMAIL, 'Sân bóng Nghĩa Tân', 'Số 2 Tô Hiệu, Nghĩa Tân, Cầu Giấy', 'HN_CG', 'PENDING');
    await newVenue('thanhxuan@gmail.com', 'Sân bóng Khương Đình', 'Ngõ 192 Khương Đình, Thanh Xuân', 'HN_TX', 'PENDING');
    await newVenue('hoangmai@gmail.com', 'Sân bóng Đền Lừ 3', 'Khu tái định cư Đền Lừ, Hoàng Mai', 'HN_HM', 'REJECTED', 'Ảnh sân chưa đúng thực tế, thiếu giấy phép xây dựng. Vui lòng cập nhật và gửi lại.');
    await newVenue('caugiay@gmail.com', 'Sân bóng Cầu Giấy Park', 'Công viên Cầu Giấy, Dịch Vọng, Cầu Giấy', 'HN_CG', 'REJECTED', 'Địa chỉ trùng với cụm sân đã có, vui lòng kiểm tra lại.');

    // ------------------------------------------------------------ Thong bao
    const myNext = mine.find((x) => x.uid === ME && x.k === 1)?.b;
    for (const [uid, team] of [[ME, myTeam], [1, 1]]) {
      const list = [
        ['BOOKING_CONFIRMED', 'Đặt sân thành công', 'Đơn đặt sân ngày mai đã được xác nhận. Hẹn gặp bạn ở sân!', 2, false],
        ['MATCH_REQUEST', 'Có đội muốn nhận kèo', 'Một đội vừa gửi lời mời nhận kèo của đội bạn. Vào Cáp kèo để duyệt.', 4, false],
        ['JOIN_REQUEST', 'Có người xin vào đá ghép', 'Một người chơi xin 1 slot trong bài tuyển chân lẻ của đội.', 6, false],
        ['TOURNAMENT_REGISTERED', `Đã đăng ký ${MARKER}`, 'Lệ phí đã được ghi nhận, chờ ban tổ chức xếp lịch.', 30, true],
        ['MATCH_RESULT_CONFIRMED', 'Đã có kết quả trận đấu', 'Chủ sân đã nhập tỷ số, điểm Elo của đội đã được cập nhật.', 50, true],
        ['SPLIT_DONE', 'Cả đội đã đóng đủ tiền trận', 'Tiền thừa do làm tròn đã được cộng vào quỹ đội.', 80, true],
        ['WALLET_TOPUP', 'Nạp ví hội viên thành công', 'Ví hội viên đã được cộng tiền và thưởng.', 120, true],
      ];
      for (const [type, title, body, h, read] of list) await notify(c, uid, type, title, body, h, read, myNext && uid === ME ? 'BOOKING' : null, myNext && uid === ME ? myNext.id : null);
      if (team) await c.query(`UPDATE team SET reputation_score = 96 WHERE id = $1`, [team]);
    }
    for (const [type, title, body, h, read] of [
      ['OWNER_BOOKING_NEW', 'Có đơn đặt sân mới', 'Khách vừa đặt và cọc sân 7 tối nay lúc 19:30.', 1, false],
      ['OWNER_BOOKING_NEW', 'Có đơn đặt sân mới', 'Đơn đặt sân 5 sáng mai 07:30 đã được cọc.', 3, false],
      ['REVIEW_NEW', 'Có đánh giá mới', 'Một khách vừa đánh giá 5 sao cho cụm sân của bạn.', 8, false],
      ['MATCH_RESULT_OWNER_DUE', 'Có trận chờ nhập tỷ số', 'Trận cáp kèo tối qua đã đá xong, nhập tỷ số để cập nhật Elo.', 14, false],
      ['TOURNAMENT_TEAM_PAID', 'Đội đã đóng lệ phí giải', `Một đội vừa đóng lệ phí ${MARKER}.`, 40, true],
      ['VENUE_REJECTED', 'Cụm sân bị từ chối', 'Sân bóng Cầu Giấy Park bị từ chối: địa chỉ trùng với cụm sân đã có.', 8, true],
    ]) await notify(c, CG, type, title, body, h, read);
    for (const a of admins) {
      for (const [type, title, body, h, read] of [
        ['OWNER_REQUEST_NEW', 'Có yêu cầu nâng cấp chủ sân', '4 người dùng đang chờ duyệt làm chủ sân.', 6, false],
        ['VENUE_SUBMITTED', 'Có cụm sân chờ duyệt', 'Sân bóng Nghĩa Tân vừa được gửi duyệt.', 20, false],
        ['COMPLAINT_NEW', 'Có khiếu nại mới', 'Đã chuyển khoản nhưng đơn chưa xác nhận.', 30, false],
      ]) await notify(c, a, type, title, body, h, read);
    }

    // ------------------------------------------------------------ Hoan tat: don qua gio -> COMPLETED + cong so tran
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
    await c.query(`UPDATE team SET total_matches = wins + draws + losses`);
    // Bai cap keo / tuyen nguoi cua tran da qua -> het han
    await c.query(`UPDATE match_post SET status = 'EXPIRED' WHERE status = 'OPEN' AND expires_at < now()`);

    console.log({ playedCount, cgCount, openCount, recruitCount, playerPostCount, splitCount, walletCount, posCount, ticketCount, tOpen2: !!tOpen2 });
  });
  if (skipped.length) {
    console.log(`Bo qua ${skipped.length} muc (trung lich / ngoai gio mo cua):`);
    const counts = {};
    for (const s of skipped) counts[s.replace(/\d{4}-\d{2}-\d{2}/, '').trim()] = (counts[s.replace(/\d{4}-\d{2}-\d{2}/, '').trim()] || 0) + 1;
    console.log(counts);
  }
  console.log('Seed bao cao xong');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
