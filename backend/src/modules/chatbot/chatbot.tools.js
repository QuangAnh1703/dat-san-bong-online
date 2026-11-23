'use strict';
const { query } = require('../../db');
const { searchArticles } = require('./chatbot.repository');

// Trung voi SLOT_MINUTES o frontend (services/mappers.js): luoi slot tren trang chi tiet san
const SLOT_MINUTES = 90;
const FIELD_TYPES = ['F5', 'F7', 'F11'];
const MAX_DAYS_AHEAD = 6;

const KNOWLEDGE_TOOL = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description:
      'Tra kho tri thức của SanBong.id.vn: cách dùng các trang, quy trình, chính sách (cọc, hủy, uy tín, giao hữu, chân lẻ...). ' +
      'Gọi khi tài liệu tham khảo đã có chưa đủ để trả lời.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Câu hỏi hoặc từ khóa, tiếng Việt' } },
      required: ['query'],
    },
  },
};

const BOOKING_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_districts',
      description: 'Danh sách quận/huyện có trong hệ thống (mã + tên). Dùng để đổi tên quận người dùng nói sang mã.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_venues',
      description: 'Tìm cụm sân đang hoạt động theo quận, từ khóa tên/địa chỉ, loại sân, giá tối đa mỗi giờ.',
      parameters: {
        type: 'object',
        properties: {
          district_code: { type: 'string', description: 'Mã quận lấy từ list_districts' },
          keyword: { type: 'string', description: 'Từ khóa trong tên hoặc địa chỉ sân' },
          field_type: { type: 'string', enum: FIELD_TYPES, description: 'F5 = sân 5, F7 = sân 7, F11 = sân 11' },
          max_price_per_hour: { type: 'number', description: 'Giá tối đa mỗi giờ (VND)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_venue_detail',
      description: 'Chi tiết một cụm sân: giờ mở cửa, tỉ lệ cọc, tiện ích, danh sách sân con, bảng giá theo khung giờ.',
      parameters: {
        type: 'object',
        properties: { venue_id: { type: 'integer' } },
        required: ['venue_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_free_slots',
      description: `Khung giờ còn trống (mỗi ca ${SLOT_MINUTES} phút) của một cụm sân trong một ngày, kèm giá và link đặt.`,
      parameters: {
        type: 'object',
        properties: {
          venue_id: { type: 'integer' },
          date: { type: 'string', description: 'YYYY-MM-DD, từ hôm nay đến 6 ngày tới' },
          field_type: { type: 'string', enum: FIELD_TYPES },
          from_time: { type: 'string', description: 'HH:MM - chỉ lấy ca bắt đầu từ giờ này' },
          to_time: { type: 'string', description: 'HH:MM - chỉ lấy ca bắt đầu trước giờ này' },
        },
        required: ['venue_id', 'date'],
      },
    },
  },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmtMinutes = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const fieldType = (v) => (FIELD_TYPES.includes(v) ? v : null);

async function listDistricts() {
  const r = await query(`SELECT code, name FROM district ORDER BY name`);
  return r.rows;
}

async function searchVenues(args) {
  const params = [];
  let where = `v.status = 'APPROVED'`;
  if (args.district_code) {
    params.push(String(args.district_code));
    where += ` AND v.district_code = $${params.length}`;
  }
  if (args.keyword) {
    params.push(`%${String(args.keyword).slice(0, 100)}%`);
    where += ` AND (v.name ILIKE $${params.length} OR v.address ILIKE $${params.length})`;
  }
  const type = fieldType(args.field_type);
  if (type) {
    params.push(type);
    where += ` AND EXISTS (SELECT 1 FROM field f WHERE f.venue_id = v.id AND f.is_active AND f.type = $${params.length})`;
  }
  const r = await query(
    `SELECT v.id, v.name, v.address, d.name AS district, v.avg_rating,
            to_char(v.open_time, 'HH24:MI') AS open_time, to_char(v.close_time, 'HH24:MI') AS close_time,
            (SELECT array_agg(DISTINCT f.type::text) FROM field f WHERE f.venue_id = v.id AND f.is_active) AS field_types,
            (SELECT min(round(pr.base_price * pr.multiplier)) FROM price_rule pr WHERE pr.venue_id = v.id)
              AS min_price_per_hour
       FROM venue v JOIN district d ON d.code = v.district_code
      WHERE ${where}
      ORDER BY v.avg_rating DESC, v.rating_count DESC
      LIMIT 20`,
    params
  );
  const maxPrice = Number(args.max_price_per_hour);
  const rows = Number.isFinite(maxPrice) && maxPrice > 0
    ? r.rows.filter((v) => v.min_price_per_hour !== null && Number(v.min_price_per_hour) <= maxPrice)
    : r.rows;
  return rows.slice(0, 6).map((v) => ({ ...v, link: `/san/${v.id}` }));
}

async function getVenueDetail({ venue_id }) {
  const id = Number(venue_id);
  const v = await query(
    `SELECT v.id, v.name, v.address, d.name AS district, v.phone, v.avg_rating, v.deposit_rate,
            to_char(v.open_time, 'HH24:MI') AS open_time, to_char(v.close_time, 'HH24:MI') AS close_time
       FROM venue v JOIN district d ON d.code = v.district_code
      WHERE v.id = $1 AND v.status = 'APPROVED'`,
    [id]
  );
  if (v.rowCount === 0) return { error: 'Không tìm thấy cụm sân này' };
  const [fields, amenities, prices] = await Promise.all([
    query(`SELECT id, name, type FROM field WHERE venue_id = $1 AND is_active ORDER BY name`, [id]),
    query(
      `SELECT a.name FROM venue_amenity va JOIN amenity a ON a.code = va.amenity_code WHERE va.venue_id = $1`,
      [id]
    ),
    query(
      `SELECT field_type, day_type, lower(time_span) AS from_minute, upper(time_span) AS to_minute,
              round(base_price * multiplier) AS price_per_hour
         FROM price_rule WHERE venue_id = $1 ORDER BY field_type, day_type, lower(time_span)`,
      [id]
    ),
  ]);
  return {
    ...v.rows[0],
    fields: fields.rows,
    amenities: amenities.rows.map((a) => a.name),
    price_rules: prices.rows.map((p) => ({
      field_type: p.field_type,
      day_type: p.day_type,
      from: fmtMinutes(p.from_minute),
      to: fmtMinutes(p.to_minute),
      price_per_hour: Number(p.price_per_hour),
    })),
    link: `/san/${id}`,
  };
}

async function findFreeSlots(args) {
  const id = Number(args.venue_id);
  const date = String(args.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Ngày phải theo định dạng YYYY-MM-DD' };
  const from = TIME_RE.test(args.from_time || '') ? toMinutes(args.from_time) : 0;
  const to = TIME_RE.test(args.to_time || '') ? toMinutes(args.to_time) : 24 * 60;

  // Sinh luoi ca giong buildSlots o frontend, bo ca da qua / da co don / chua co bang gia.
  // Ghep ngay + gio bang timezone cua phien DB, giong cach POST /api/bookings tao time_range
  const r = await query(
    `WITH v AS (
       SELECT id, (extract(hour FROM open_time) * 60 + extract(minute FROM open_time))::int AS open_min,
              (extract(hour FROM close_time) * 60 + extract(minute FROM close_time))::int AS close_min
         FROM venue
        WHERE id = $1 AND status = 'APPROVED'
          AND $2::date BETWEEN current_date AND current_date + $6::int
     ), grid AS (
       SELECT f.id AS field_id, f.name AS field_name, f.type AS field_type, gs AS start_min,
              ($2::date + make_interval(mins => gs))::timestamptz AS start_at
         FROM v
         JOIN field f ON f.venue_id = v.id AND f.is_active AND ($3::field_type IS NULL OR f.type = $3::field_type)
        CROSS JOIN LATERAL generate_series(v.open_min, v.close_min - $7::int, $7::int) gs
        WHERE gs >= $4 AND gs < $5
     )
     SELECT g.field_id, g.field_name, g.field_type, g.start_min,
            round(pr.base_price * pr.multiplier * $7::int / 60.0) AS price
       FROM grid g
       JOIN price_rule pr
         ON pr.venue_id = $1 AND pr.field_type = g.field_type
        AND pr.day_type = (CASE WHEN extract(isodow FROM $2::date) >= 6 THEN 'WEEKEND' ELSE 'WEEKDAY' END)::day_type
        AND pr.time_span @> g.start_min
      WHERE g.start_at > now()
        AND NOT EXISTS (
          SELECT 1 FROM booking_slot s
           WHERE s.field_id = g.field_id AND s.status IN ('HELD', 'CONFIRMED', 'LOCKED')
             AND s.time_range && tstzrange(g.start_at, g.start_at + make_interval(mins => $7::int), '[)'))
      ORDER BY g.start_min, g.field_name`,
    [id, date, fieldType(args.field_type), from, to, MAX_DAYS_AHEAD, SLOT_MINUTES]
  );

  const slots = r.rows.slice(0, 15).map((s) => {
    const start = fmtMinutes(s.start_min);
    return {
      field: `${s.field_name} (${s.field_type})`,
      start,
      end: fmtMinutes(s.start_min + SLOT_MINUTES),
      price: Number(s.price),
      link: `/san/${id}?ngay=${date}&san=${s.field_id}&gio=${start}`,
    };
  });
  const result = { venue_id: id, date, slot_minutes: SLOT_MINUTES, total_free: r.rowCount, slots };
  if (r.rowCount === 0) {
    result.note = 'Không còn ca trống: sân đã kín, đã qua giờ, ngày ngoài phạm vi, hoặc chủ sân chưa có bảng giá cho ngày/loại sân này';
  }
  return result;
}

async function searchKnowledge({ query: q }, ctx) {
  const rows = await searchArticles(String(q || '').slice(0, 300), { role: ctx.role, limit: 3 });
  ctx.sources.push(...rows);
  if (rows.length === 0) return { results: [], note: 'Kho tri thức không có bài phù hợp' };
  return { results: rows.map((a) => ({ title: a.title, route: a.route, content: a.content })) };
}

const HANDLERS = {
  search_knowledge: searchKnowledge,
  list_districts: listDistricts,
  search_venues: searchVenues,
  get_venue_detail: getVenueDetail,
  find_free_slots: findFreeSlots,
};

// Cong cu tra lich / dat san chi danh cho khach va nguoi choi; chu san, admin chi tra kho tri thuc
function toolsFor(role) {
  return role === 'GUEST' || role === 'PLAYER' ? [KNOWLEDGE_TOOL, ...BOOKING_TOOLS] : [KNOWLEDGE_TOOL];
}

async function runTool(name, rawArgs, ctx) {
  const handler = HANDLERS[name];
  if (!handler || !toolsFor(ctx.role).some((t) => t.function.name === name)) return { error: `Không có công cụ ${name}` };
  let args = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: 'Tham số không phải JSON hợp lệ' };
  }
  try {
    return await handler(args, ctx);
  } catch (err) {
    console.error('[chatbot] tool %s loi: %s', name, err.message);
    return { error: 'Không tra cứu được dữ liệu, thử lại sau' };
  }
}

module.exports = { toolsFor, runTool, SLOT_MINUTES };
