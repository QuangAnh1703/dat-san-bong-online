'use strict';
const { AppError } = require('../lib/errors');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Xem truc tiep toi da 1 nam; dai hon thi xuat file chay nen va gui qua email (PRD 3.3)
const MAX_DIRECT_DAYS = 366;

const BANDS = [
  ['06:00 - 11:00', 360, 660],
  ['11:00 - 15:00', 660, 900],
  ['15:00 - 17:30', 900, 1050],
  ['17:30 - 21:00', 1050, 1260],
  ['21:00 - 24:00', 1260, 1440],
];

const isoDate = (d) => d.toISOString().slice(0, 10);

/** Doc ?from=&to= (YYYY-MM-DD), mac dinh tu dau thang toi hom nay */
function parseRange(q) {
  const today = new Date();
  const from = q.from || isoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)));
  const to = q.to || isoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    throw new AppError('INVALID_FIELD', { details: { field: 'from/to', reason: 'YYYY-MM-DD' } });
  }
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (days < 1) throw new AppError('INVALID_TIME_RANGE', { message: 'Ngày bắt đầu phải trước ngày kết thúc' });
  return { from, to, days };
}

/** Moc Ngay / Tuan / Thang cua chu san -> khoang ngay (tuan tinh tu thu 2) */
function periodRange(period) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  let start = today;
  if (period === 'week') start = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000);
  if (period === 'month') start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return parseRange({ from: isoDate(start), to: isoDate(today) });
}

/**
 * So lieu bao cao trong [from, to] theo ngay da (play_date).
 * venueId = null -> toan san. Tra ve tong quan, chuoi theo ngay/thang, ty le lap day theo khung gio, top cum san.
 */
async function buildReport(db, { from, to, days, venueId = null }) {
  const params = [from, to, venueId];
  const summary = await db.query(
    `WITH b AS (
       SELECT DISTINCT b.id, b.status, b.kind
         FROM booking b JOIN booking_slot s ON s.booking_id = b.id
        WHERE s.play_date BETWEEN $1 AND $2 AND ($3::bigint IS NULL OR b.venue_id = $3)
          AND b.kind <> 'OWNER_LOCK')
     SELECT
       (SELECT count(*) FROM b) AS bookings,
       (SELECT count(*) FROM b WHERE status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')) AS confirmed,
       (SELECT count(*) FROM b WHERE status::text LIKE 'CANCELLED%' OR status = 'REFUNDED') AS cancelled,
       (SELECT COALESCE(sum(s.price), 0) FROM booking_slot s JOIN booking bk ON bk.id = s.booking_id
         WHERE s.play_date BETWEEN $1 AND $2 AND ($3::bigint IS NULL OR bk.venue_id = $3)
           AND bk.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') AND s.status <> 'RELEASED') AS gross,
       (SELECT COALESCE(sum(pm.amount), 0) FROM payment pm JOIN booking bk ON bk.id = pm.booking_id
         WHERE pm.status = 'SUCCESS' AND pm.paid_at::date BETWEEN $1 AND $2
           AND ($3::bigint IS NULL OR bk.venue_id = $3)) AS deposit,
       -- Doanh thu dich vu tach rieng tien san (PRD 2.2.5): dat kem online + ban tai quay da thu
       (SELECT COALESCE(sum(bs.price * bs.quantity), 0) FROM booking_service bs JOIN booking bk ON bk.id = bs.booking_id
         WHERE bk.id IN (SELECT id FROM b) AND bk.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED'))
       + (SELECT COALESCE(sum(i.price * i.quantity), 0) FROM service_order o JOIN service_order_item i ON i.order_id = o.id
           WHERE o.paid_at::date BETWEEN $1 AND $2 AND ($3::bigint IS NULL OR o.venue_id = $3)) AS service_revenue,
       (SELECT count(*) FROM match_post mp LEFT JOIN booking bk ON bk.id = mp.booking_id
         WHERE mp.status = 'MATCHED' AND mp.play_date BETWEEN $1 AND $2
           AND ($3::bigint IS NULL OR bk.venue_id = $3)) AS matched_posts`,
    params
  );

  const byMonth = days > 62;
  const series = await db.query(
    `WITH buckets AS (
       SELECT generate_series(date_trunc($4, $1::date), date_trunc($4, $2::date), ('1 ' || $4)::interval)::date AS bucket
     ), data AS (
       SELECT date_trunc($4, s.play_date)::date AS bucket, count(DISTINCT b.id) AS bookings, sum(s.price) AS gross
         FROM booking_slot s JOIN booking b ON b.id = s.booking_id
        WHERE s.play_date BETWEEN $1 AND $2 AND ($3::bigint IS NULL OR b.venue_id = $3)
          AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED') AND s.status <> 'RELEASED'
        GROUP BY 1)
     SELECT to_char(k.bucket, 'YYYY-MM-DD') AS bucket, COALESCE(d.bookings, 0) AS bookings, COALESCE(d.gross, 0) AS gross
       FROM buckets k LEFT JOIN data d ON d.bucket = k.bucket ORDER BY k.bucket`,
    [from, to, venueId, byMonth ? 'month' : 'day']
  );

  // Lap day = so phut da ban trong khung / (so san con dang mo * so ngay * do dai khung)
  const occupancy = await db.query(
    `WITH band(label, from_min, to_min, ord) AS (
       SELECT * FROM unnest($4::text[], $5::int[], $6::int[], $7::int[])
     ), used AS (
       SELECT (extract(hour FROM lower(s.time_range)) * 60 + extract(minute FROM lower(s.time_range)))::int AS s_min,
              (extract(epoch FROM upper(s.time_range) - lower(s.time_range)) / 60)::int AS dur
         FROM booking_slot s JOIN field f ON f.id = s.field_id
        WHERE s.status IN ('CONFIRMED', 'LOCKED') AND s.play_date BETWEEN $1 AND $2
          AND ($3::bigint IS NULL OR f.venue_id = $3)
     ), fields AS (
       SELECT count(*) AS n FROM field f JOIN venue v ON v.id = f.venue_id
        WHERE f.is_active AND v.status = 'APPROVED' AND ($3::bigint IS NULL OR v.id = $3)
     )
     SELECT b.label,
            -- GREATEST/LEAST bo qua NULL: dong rong cua LEFT JOIN phai tinh la 0, khong phai ca khung gio
            COALESCE(sum(GREATEST(0, LEAST(u.s_min + u.dur, b.to_min) - GREATEST(u.s_min, b.from_min)))
                       FILTER (WHERE u.s_min IS NOT NULL), 0) AS used_min,
            (SELECT n FROM fields) * $8::int * (b.to_min - b.from_min) AS capacity_min
       FROM band b LEFT JOIN used u ON TRUE
      GROUP BY b.label, b.from_min, b.to_min, b.ord
      ORDER BY b.ord`,
    [
      from,
      to,
      venueId,
      BANDS.map((b) => b[0]),
      BANDS.map((b) => b[1]),
      BANDS.map((b) => b[2]),
      BANDS.map((_, i) => i),
      days,
    ]
  );

  const bands = occupancy.rows.map((r) => ({
    label: r.label,
    used_minutes: Number(r.used_min),
    capacity_minutes: Number(r.capacity_min),
    rate: Number(r.capacity_min) > 0 ? Math.round((Number(r.used_min) / Number(r.capacity_min)) * 10000) / 100 : 0,
  }));
  const usedAll = bands.reduce((s, b) => s + b.used_minutes, 0);
  const capAll = bands.reduce((s, b) => s + b.capacity_minutes, 0);
  const s = summary.rows[0];

  return {
    from,
    to,
    days,
    granularity: byMonth ? 'month' : 'day',
    summary: {
      bookings: Number(s.bookings),
      confirmed: Number(s.confirmed),
      cancelled: Number(s.cancelled),
      gross: Number(s.gross),
      deposit: Number(s.deposit),
      service_revenue: Number(s.service_revenue),
      matched_posts: Number(s.matched_posts),
      occupancy_rate: capAll > 0 ? Math.round((usedAll / capAll) * 10000) / 100 : 0,
    },
    series: series.rows.map((r) => ({ bucket: r.bucket, bookings: Number(r.bookings), gross: Number(r.gross) })),
    occupancy: bands,
    empty: Number(s.bookings) === 0 && usedAll === 0,
  };
}

/** So lieu tung cum san trong khoang ngay, dung cho file xuat */
async function venueBreakdown(db, { from, to, days }) {
  const r = await db.query(
    `SELECT v.id, v.name, d.name AS district,
            (SELECT count(DISTINCT b.id) FROM booking b JOIN booking_slot s ON s.booking_id = b.id
              WHERE b.venue_id = v.id AND b.kind <> 'OWNER_LOCK' AND s.play_date BETWEEN $1 AND $2) AS bookings,
            (SELECT COALESCE(sum(s.price), 0) FROM booking b JOIN booking_slot s ON s.booking_id = b.id
              WHERE b.venue_id = v.id AND s.play_date BETWEEN $1 AND $2 AND s.status <> 'RELEASED'
                AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')) AS gross,
            (SELECT COALESCE(sum(pm.amount), 0) FROM payment pm JOIN booking b ON b.id = pm.booking_id
              WHERE b.venue_id = v.id AND pm.status = 'SUCCESS' AND pm.paid_at::date BETWEEN $1 AND $2) AS deposit,
            (SELECT COALESCE(sum(extract(epoch FROM upper(s.time_range) - lower(s.time_range)) / 60), 0)
               FROM booking_slot s JOIN field f ON f.id = s.field_id
              WHERE f.venue_id = v.id AND s.status IN ('CONFIRMED', 'LOCKED') AND s.play_date BETWEEN $1 AND $2) AS used_min,
            (SELECT count(*) FROM field f WHERE f.venue_id = v.id AND f.is_active)
              * $3::int * GREATEST(extract(epoch FROM v.close_time - v.open_time) / 60, 0) AS capacity_min
       FROM venue v JOIN district d ON d.code = v.district_code
      WHERE v.status = 'APPROVED'
      ORDER BY gross DESC, v.name`,
    [from, to, days]
  );
  return r.rows.map((x) => ({
    id: Number(x.id),
    name: x.name,
    district: x.district,
    bookings: Number(x.bookings),
    gross: Number(x.gross),
    deposit: Number(x.deposit),
    occupancy_rate: Number(x.capacity_min) > 0 ? Math.round((Number(x.used_min) / Number(x.capacity_min)) * 10000) / 100 : 0,
  }));
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV co BOM UTF-8 de Excel mo dung tieng Viet */
function toCsv(report, venues) {
  const rows = [
    ['BÁO CÁO TOÀN HỆ THỐNG SANBONG.VN'],
    ['Từ ngày', report.from, 'Đến ngày', report.to],
    [],
    ['Tổng lượt đặt', report.summary.bookings],
    ['Đơn đã xác nhận', report.summary.confirmed],
    ['Đơn hủy / hoàn cọc', report.summary.cancelled],
    ['Tổng doanh thu (VNĐ)', report.summary.gross],
    ['Tiền cọc đã thu (VNĐ)', report.summary.deposit],
    ['Tỷ lệ lấp đầy trung bình (%)', report.summary.occupancy_rate],
    [],
    ['Khung giờ', 'Tỷ lệ lấp đầy (%)'],
    ...report.occupancy.map((b) => [b.label, b.rate]),
    [],
    ['Cụm sân', 'Quận/Huyện', 'Lượt đặt', 'Doanh thu (VNĐ)', 'Tiền cọc (VNĐ)', 'Lấp đầy (%)'],
    ...venues.map((v) => [v.name, v.district, v.bookings, v.gross, v.deposit, v.occupancy_rate]),
  ];
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

module.exports = { MAX_DIRECT_DAYS, parseRange, periodRange, buildReport, venueBreakdown, toCsv };
