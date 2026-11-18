// Chuyển dữ liệu thô từ backend sang kiểu dữ liệu mà các component đang dùng

import heroImg from '../assets/images/hero_football_pitch_1790752166238.jpg';
import turfImg from '../assets/images/pitch_turf_showcase_1790752185840.jpg';

// Backend tính tiền theo số giờ thực đặt; UI chia lịch thành các trận 90 phút
export const SLOT_MINUTES = 90;

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const pad2 = (n) => n.toString().padStart(2, '0');
export const minutesToHHMM = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
const hhmmToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const toLocalISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayISO = () => toLocalISODate(new Date());
const localHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export const formatViDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const FIELD_TYPE_TO_PITCH = { F5: '5', F7: '7', F11: '11' };
export const pitchTypeToFieldType = (t) => `F${t}`;

const SKILL_FROM_API = {
  BEGINNER: 'chill',
  INTERMEDIATE: 'intermediate',
  GOOD: 'hardcore',
  SEMI_PRO: 'pro',
};
export const skillToApi = (s) => Object.keys(SKILL_FROM_API).find((k) => SKILL_FROM_API[k] === s) || 'INTERMEDIATE';

export const SKILL_LABELS = {
  chill: 'Vừa đá vừa thở (Vui vẻ)',
  intermediate: 'Trung bình khá (Chạy nhiệt)',
  hardcore: 'Phủi cứng (Thể lực tốt)',
  pro: 'Bán chuyên / Thi đấu giải',
};

export const roleFromApi = (r) => (r === 'OWNER' ? 'owner' : r === 'ADMIN' ? 'admin' : 'player');

// ---------------------------------------------------------------- user

export function mapTeam(t) {
  if (!t) return null;
  return {
    id: String(t.id),
    name: t.name,
    memberCount: num(t.member_count, 10),
    skillLevel: SKILL_FROM_API[t.skill_level] || 'intermediate',
    districtCode: t.district_code || null,
  };
}

export function mapProfile(p, districtName, team = null) {
  return {
    team,
    id: String(p.id),
    role: roleFromApi(p.role),
    districtCode: p.districtCode || null,
    name: p.fullName || '',
    phone: p.phone || '',
    email: p.email || '',
    teamName: team?.name || '',
    memberCount: team?.memberCount || 0,
    skillLevel: SKILL_FROM_API[p.skillLevel] || 'intermediate',
    preferredPosition: p.preferredPosition || 'ANY',
    homeDistrict: districtName(p.districtCode || null),
    matchesPlayed: num(p.totalMatches),
    reputationScore: num(p.reputationScore),
  };
}

export function mapAdminUser(u) {
  return {
    id: String(u.id),
    name: u.full_name || '(chưa có tên)',
    phone: u.phone || '',
    email: u.email || '',
    role: roleFromApi(u.role),
    status: u.status === 'ACTIVE' ? 'active' : 'suspended',
    locked: u.status === 'LOCKED',
    createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '',
  };
}

// ---------------------------------------------------------------- venues

function mapPriceRule(r) {
  return {
    fieldType: FIELD_TYPE_TO_PITCH[r.field_type] || '7',
    dayType: r.day_type,
    fromMinute: num(r.from_minute),
    toMinute: num(r.to_minute),
    // Giữ số chưa làm tròn để khớp cách backend tính: round(base * multiplier * số giờ)
    pricePerHour: num(r.base_price) * num(r.multiplier, 1),
    multiplier: num(r.multiplier, 1),
    label: r.label || null,
  };
}

const slotPrice = (rule) => Math.round((rule.pricePerHour * SLOT_MINUTES) / 60);

// Cùng quy tắc với backend: sân đã cấu hình thì theo cấu hình, không thì 10% (15% từ 3 tháng)
export function contractDiscount(pitch, months) {
  if (pitch.contractDiscounts.length === 0) return months >= 3 ? 15 : 10;
  const ok = pitch.contractDiscounts.filter((c) => c.minMonths === null || c.minMonths <= months);
  return ok.length ? Math.max(...ok.map((c) => c.percent)) : 0;
}

function mapFlashSale(f) {
  if (!f) return null;
  return {
    discountPercent: num(f.discount_percent),
    triggerHoursBefore: num(f.trigger_hours_before),
    floorPrice: f.floor_price != null ? num(f.floor_price) : null,
    fieldType: f.applies_field_type ? FIELD_TYPE_TO_PITCH[f.applies_field_type] : null,
    timeSpans: f.time_spans
      ? f.time_spans.map((t) => ({ fromMinute: num(t.from_minute), toMinute: num(t.to_minute) }))
      : null,
  };
}

// Cùng quy tắc với backend (pricing.service.js): slot còn trống, cách giờ đá <= N giờ, nằm trong khung áp dụng
function flashDiscount(pitch, sub, slotStart, startMinute, base) {
  const f = pitch.flashSale;
  if (!f) return 0;
  if (f.fieldType && f.fieldType !== sub.type) return 0;
  const hoursAhead = (slotStart.getTime() - Date.now()) / 3_600_000;
  if (hoursAhead <= 0 || hoursAhead > f.triggerHoursBefore) return 0;
  if (f.timeSpans && !f.timeSpans.some((t) => startMinute >= t.fromMinute && startMinute < t.toMinute)) return 0;
  let discount = Math.round((base * f.discountPercent) / 100);
  if (f.floorPrice != null && base - discount < f.floorPrice) discount = Math.max(0, base - f.floorPrice);
  return discount;
}

export function mapVenue(v) {
  const rules = (v.price_rules || []).map(mapPriceRule);
  const prices = rules.map(slotPrice);
  const amenityCodes = (v.amenities || []).map((a) => a.code);

  return {
    id: String(v.id),
    ownerId: v.owner_id != null ? String(v.owner_id) : undefined,
    name: v.name,
    address: v.address,
    district: v.district_name || '',
    city: '',
    rating: num(v.avg_rating),
    reviewCount: num(v.rating_count),
    // Backend chưa trả ảnh sân -> dùng ảnh minh họa có sẵn
    image: num(v.id) % 2 === 0 ? heroImg : turfImg,
    phone: v.phone || '',
    openingHours: `${String(v.open_time || '06:00').slice(0, 5)} - ${String(v.close_time || '23:59').slice(0, 5)}`,
    openTime: String(v.open_time || '06:00').slice(0, 5),
    closeTime: String(v.close_time || '23:59').slice(0, 5),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    hasParking: amenityCodes.includes('PARKING'),
    hasShower: amenityCodes.includes('SHOWER'),
    hasCanteen: amenityCodes.includes('CANTEEN'),
    hasReferee: amenityCodes.includes('REFEREE'),
    hasFreeBib: false,
    latitude: v.latitude != null ? num(v.latitude) : undefined,
    longitude: v.longitude != null ? num(v.longitude) : undefined,
    depositRate: num(v.deposit_rate, 0.3),
    priceRules: rules,
    services: (v.services || []).map((x) => ({
      id: String(x.id),
      name: x.name,
      price: num(x.price),
      category: x.category || 'OTHER',
      stock: x.stock == null ? null : num(x.stock),
    })),
    flashSale: mapFlashSale(v.flash_sale),
    contractDiscounts: (v.contract_discounts || []).map((c) => ({
      minMonths: c.min_contract_months != null ? num(c.min_contract_months) : null,
      percent: num(c.discount_percent),
    })),
    subPitches: (v.fields || [])
      .filter((f) => f.is_active)
      .map((f) => ({
        id: String(f.id),
        name: f.name,
        type: FIELD_TYPE_TO_PITCH[f.type] || '7',
        turfType: '',
        lighting: '',
        status: 'active',
        slots: [],
      })),
  };
}

// Backend không có API "slot trống": dựng lưới trận 90 phút từ giờ mở cửa + bảng giá,
// rồi đánh dấu các khung đã bị giữ/đặt/khóa theo /api/fields/:id/schedule
export function buildSlots(pitch, sub, date, schedule) {
  const [y, mo, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, mo - 1, d).getDay();
  const dayType = dayOfWeek === 0 || dayOfWeek === 6 ? 'WEEKEND' : 'WEEKDAY';
  const rules = pitch.priceRules.filter((r) => r.fieldType === sub.type && r.dayType === dayType);

  const open = hhmmToMinutes(pitch.openTime);
  const close = hhmmToMinutes(pitch.closeTime);
  const now = new Date();
  const isToday = date === toLocalISODate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const taken = schedule.map((s) => ({
    start: new Date(s.start_at),
    end: new Date(s.end_at),
    status: s.slot_status,
    customer: s.customer_name,
    code: s.booking_code,
    kind: s.booking_kind,
  }));

  const slots = [];
  for (let start = open; start + SLOT_MINUTES <= close; start += SLOT_MINUTES) {
    if (isToday && start <= nowMinutes) continue;
    const rule = rules.find((r) => start >= r.fromMinute && start < r.toMinute);
    // Không có bảng giá thì backend sẽ từ chối (NO_PRICE_RULE) -> không cho đặt
    if (!rule) continue;

    const end = start + SLOT_MINUTES;
    const slotStart = new Date(y, mo - 1, d, Math.floor(start / 60), start % 60);
    const slotEnd = new Date(y, mo - 1, d, Math.floor(end / 60), end % 60);
    const hit = taken.find((t) => t.start < slotEnd && t.end > slotStart);
    const base = slotPrice(rule);
    const discount = hit ? 0 : flashDiscount(pitch, sub, slotStart, start, base);

    slots.push({
      id: `${sub.id}-${date}-${start}`,
      subPitchId: sub.id,
      startTime: minutesToHHMM(start),
      endTime: minutesToHHMM(end),
      price: base - discount,
      originalPrice: discount > 0 ? base : undefined,
      isFlashSale: discount > 0,
      isPeak: rule.multiplier > 1,
      status: !hit ? 'available' : hit.status === 'LOCKED' ? 'locked' : hit.status === 'HELD' ? 'holding' : 'booked',
      bookedBy: hit?.customer || undefined,
      lockReason: hit?.status === 'LOCKED' ? hit.customer || 'Chủ sân khóa lịch' : undefined,
      bookingCode: hit?.code,
      bookingKind: hit?.kind,
    });
  }
  return slots;
}

// ---------------------------------------------------------------- bookings

const BOOKING_STATUS = {
  HELD: 'holding',
  PENDING_VERIFY: 'holding',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'confirmed',
  COMPLETED: 'completed',
};

export function mapBooking(b, pitches) {
  const slots = b.slots || [];
  const first = slots[0];
  const last = slots[slots.length - 1];
  const start = first ? new Date(first.start_at) : null;
  const end = last ? new Date(last.end_at) : null;
  const pitch = pitches.find((p) => p.id === String(b.venue_id));

  return {
    id: b.code,
    pitchId: String(b.venue_id),
    pitchName: b.venue_name || pitch?.name || '',
    pitchAddress: !pitch
      ? ''
      : pitch.address.includes(pitch.district)
        ? pitch.address
        : `${pitch.address}, ${pitch.district}`,
    subPitchId: '',
    subPitchName: [...new Set(slots.map((s) => s.field_name).filter(Boolean))].join(', '),
    date: start ? toLocalISODate(start) : '',
    startTime: start ? localHHMM(start) : '',
    endTime: end ? localHHMM(end) : '',
    startsAt: start ? start.getTime() : undefined,
    endsAt: end ? end.getTime() : undefined,
    totalPrice: num(b.total_amount),
    depositPaid: num(b.deposit_amount),
    status: BOOKING_STATUS[b.status] || 'cancelled',
    rawStatus: b.status,
    holdExpiresAt: b.hold_expires_at || undefined,
    bookingDbId: num(b.id),
    services: (b.services || []).map((x) => ({
      name: (x.quantity || 1) > 1 ? `${x.name} x${x.quantity}` : x.name,
      price: num(x.price) * (x.quantity || 1),
    })),
    discountAmount: num(b.discount_amount),
    sessionsTotal: b.kind === 'RECURRING' ? slots.length : undefined,
    hasComplaint: !!b.has_complaint,
    conversationId: b.conversation_id ? String(b.conversation_id) : null,
    review: b.pitch_rating
      ? {
          pitchRating: num(b.pitch_rating),
          serviceRating: num(b.service_rating),
          comment: b.review_comment || '',
          ownerReply: b.review_reply || '',
        }
      : null,
    bookingType: b.kind === 'RECURRING' ? 'recurring' : 'online',
    teamName: b.team_name || '',
    isParticipant: !!b.is_participant,
    hostName: b.host_name || '',
    hostPhone: b.host_phone || '',
    venueAddress: b.venue_address || '',
    hasOpenRecruit: !!b.has_open_recruit,
    bookerName: b.guest_name || '',
    phone: b.guest_phone || '',
    note: b.note || undefined,
    lookingForRival: false,
    addOns: [],
    createdAt: b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : '',
  };
}

// ---------------------------------------------------------------- community

const POST_TYPE_LABEL = {
  TEAM_FINDS_TEAM: 'Đội tìm đối giao hữu',
  TEAM_FINDS_PLAYER: 'Đội tìm thêm người',
  PLAYER_FINDS_TEAM: 'Người chơi tìm đội',
};

const COST_LABEL = {
  FREE: 'Miễn phí',
  FIXED: 'Chia tiền cố định',
  VOLUNTARY: 'Góp tùy tâm',
};

// time_span là int4range theo phút trong ngày, dạng "[1140,1230)"
const formatTimeSpan = (span) => {
  const m = span?.match(/(\d+),(\d+)/);
  return m ? `${minutesToHHMM(Number(m[1]))} - ${minutesToHHMM(Number(m[2]))}` : 'Chưa chốt giờ';
};

export function mapPost(p, districtName) {
  const level = SKILL_FROM_API[p.required_level] || 'intermediate';
  const cost =
    p.deal_note ||
    (p.cost_kind
      ? `${COST_LABEL[p.cost_kind] || p.cost_kind}${p.cost_amount ? ` ${num(p.cost_amount).toLocaleString('vi-VN')}đ` : ''}`
      : 'Thỏa thuận');

  const district = p.district_name || districtName(p.district_code);
  return {
    id: String(p.id),
    hostTeam: p.team_name || POST_TYPE_LABEL[p.type] || p.type,
    contactName: p.author_name || `Thành viên #${p.author_user_id}`,
    phone: '',
    pitchId: p.venue_id ? String(p.venue_id) : '',
    pitchName: p.venue_name
      ? `${p.venue_name}${p.field_name ? ` · ${p.field_name}` : ''}`
      : district || 'Chưa chọn khu vực',
    district,
    date: p.play_date ? formatViDate(toLocalISODate(new Date(p.play_date))) : '',
    timeSlot: formatTimeSpan(p.time_span),
    pitchType: FIELD_TYPE_TO_PITCH[p.field_type] || '7',
    skillLevel: level,
    skillLabel: SKILL_LABELS[level],
    costSharing: cost,
    note: p.content || '',
    status: p.status === 'OPEN' ? 'open' : 'matched',
    applicants: [],
    authorId: String(p.author_user_id),
    pendingRequests: num(p.pending_requests),
    myRequestStatus: p.my_request_status || null,
  };
}

export function mapJoinRequest(r) {
  return {
    id: String(r.id),
    requesterName: r.requester_name || `Thành viên #${r.requester_user_id}`,
    requesterPhone: r.requester_phone || '',
    teamName: r.requester_team_name || null,
    message: r.message || '',
    status: r.status,
    createdAt: r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '',
  };
}

// ---------------------------------------------------------------- ghép chân lẻ

// Thang trình độ theo PRD mục 2.1.6 (khác nhãn mô tả đội ở SKILL_LABELS)
export const FREELANCE_LEVELS = [
  { value: 'BEGINNER', label: 'Mới chơi' },
  { value: 'INTERMEDIATE', label: 'Trung bình' },
  { value: 'GOOD', label: 'Khá' },
  { value: 'SEMI_PRO', label: 'Phủi' },
];
export const levelLabel = (v) => FREELANCE_LEVELS.find((l) => l.value === v)?.label || v;

export const POSITIONS = [
  { value: 'FW', label: 'Tiền đạo' },
  { value: 'MF', label: 'Tiền vệ' },
  { value: 'DF', label: 'Hậu vệ' },
  { value: 'GK', label: 'Thủ môn' },
  { value: 'ANY', label: 'Đá tự do' },
];
export const positionLabel = (v) => POSITIONS.find((p) => p.value === v)?.label || v;

export const PERIODS = [
  { value: 'morning', label: 'Sáng' },
  { value: 'afternoon', label: 'Chiều' },
  { value: 'evening', label: 'Tối' },
];

export const costText = (kind, amount) =>
  kind === 'FIXED'
    ? `${num(amount).toLocaleString('vi-VN')}đ/người`
    : kind === 'VOLUNTARY'
      ? 'Đóng tự nguyện'
      : kind === 'FREE'
        ? 'Miễn phí'
        : '';

const isoDate = (d) => (d ? toLocalISODate(new Date(d)) : '');
const whenFromSpan = (playDate, span) => `${playDate ? formatViDate(isoDate(playDate)) : ''} · ${formatTimeSpan(span)}`;
const whenFromRange = (start, end) =>
  start ? `${formatViDate(toLocalISODate(new Date(start)))} · ${localHHMM(new Date(start))} - ${localHHMM(new Date(end))}` : '';

export function mapRecruit(p) {
  return {
    id: p.id,
    status: p.status,
    teamName: p.team_name || p.author_name,
    authorName: p.author_name,
    venueName: p.venue_name ? `${p.venue_name}${p.field_name ? ` · ${p.field_name}` : ''}` : '',
    district: p.district_name || '',
    when: whenFromSpan(p.play_date, p.time_span),
    level: p.required_level,
    slotsNeeded: num(p.slots_needed),
    slotsFilled: num(p.slots_filled),
    positions: p.positions || [],
    cost: costText(p.cost_kind, p.cost_amount),
    note: p.content || '',
    bumped: !!p.bumped_at,
    myRequestStatus: p.my_request_status || null,
    pendingRequests: p.pending_requests === null || p.pending_requests === undefined ? null : num(p.pending_requests),
  };
}

export function mapPlayerPost(p, districtName) {
  return {
    id: p.id,
    status: p.status,
    authorId: String(p.author_user_id || ''),
    name: p.author_name,
    reputation: p.reputation_score === undefined ? null : num(p.reputation_score),
    matches: num(p.total_matches),
    when: whenFromSpan(p.play_date, p.time_span),
    districts: (p.district_codes || []).map(districtName).join(', '),
    level: p.required_level,
    positions: p.positions || [],
    note: p.content || '',
    myInviteStatus: p.my_invite_status || null,
  };
}

export function mapFreelanceRequest(r) {
  return {
    id: r.id,
    status: r.status,
    name: r.requester_name,
    level: r.skill_level,
    position: r.preferred_position,
    reputation: num(r.reputation_score),
    matches: num(r.total_matches),
    message: r.message || '',
    levelWarning: !!r.level_warning_ack,
    phone: r.requester_phone || '',
  };
}

export function mapFreelanceMine(m, districtName) {
  const match = (x) => ({
    venueName: x.venue_name ? `${x.venue_name}${x.field_name ? ` · ${x.field_name}` : ''}` : '',
    venueAddress: x.venue_address || '',
    when: whenFromRange(x.start_at, x.end_at),
    bookingCode: x.booking_code,
  });
  return {
    recruits: (m.recruits || []).map((p) => ({
      ...mapRecruit(p),
      ...match(p),
      pendingRequests: num(p.pending_requests),
    })),
    playerPosts: (m.player_posts || []).map((p) => mapPlayerPost(p, districtName)),
    applications: (m.applications || []).map((a) => ({
      id: a.id,
      status: a.status,
      message: a.message || '',
      teamName: a.team_name || a.captain_name,
      captainName: a.captain_name,
      captainPhone: a.captain_phone || '',
      cost: costText(a.cost_kind, a.cost_amount),
      ...match(a),
    })),
    invites: (m.invites || []).map((i) => ({
      id: i.id,
      status: i.status,
      sentByMe: !!i.sent_by_me,
      message: i.message || '',
      teamName: i.team_name || i.captain_name,
      captainName: i.captain_name,
      captainPhone: i.captain_phone || '',
      playerName: i.player_name,
      cost: costText(i.cost_kind, i.cost_amount),
      expiresAt: i.expires_at ? new Date(i.expires_at).getTime() : null,
      ...match(i),
    })),
  };
}

// ---------------------------------------------------------------- owner

export function mapOwnerBooking(b) {
  const slots = b.slots || [];
  const first = slots[0];
  const start = first ? new Date(first.start_at) : null;
  const end = first ? new Date(first.end_at) : null;
  const when = start && end ? `${formatViDate(toLocalISODate(start))} (${localHHMM(start)} - ${localHHMM(end)})` : '';
  return {
    code: b.code,
    kind: b.kind,
    status: b.status,
    customerName: b.customer_name || '—',
    customerPhone: b.customer_phone || '',
    teamName: b.team_name || null,
    note: b.note || null,
    totalAmount: num(b.total_amount),
    depositAmount: num(b.deposit_amount),
    slotsLabel: `${[...new Set(slots.map((s) => s.field_name))].join(', ')} · ${when}${slots.length > 1 ? ` + ${slots.length - 1} buổi` : ''}`,
    sessions: slots.length,
    services: (b.services || []).map((x) => ((x.quantity || 1) > 1 ? `${x.name} x${x.quantity}` : x.name)),
    paymentStatus: b.payment?.status || null,
    amountReceived: num(b.amount_received),
    checkedOut: !!b.checked_out_at,
    createdAt: b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : '',
  };
}

export function mapBankTransaction(t) {
  return {
    id: t.id,
    amount: num(t.amount),
    content: t.content || '',
    accountNumber: t.account_number || '',
    bankName: t.bank_name || '',
    status: t.status,
    note: t.note || '',
    isMock: t.provider === 'MOCK',
    receivedAt: new Date(t.transaction_at || t.received_at).toLocaleString('vi-VN'),
    bookingCode: t.booking_code || null,
    bookingStatus: t.booking_status || null,
    depositAmount: t.deposit_amount == null ? null : num(t.deposit_amount),
    venueName: t.venue_name || null,
    customerName: t.customer_name || null,
  };
}

// ---------------------------------------------------------------- admin (khiếu nại, báo cáo)

export function mapComplaint(c) {
  return {
    id: String(c.id),
    code: c.code,
    status: c.status,
    subject: c.subject,
    content: c.content,
    resolution: c.resolution || null,
    bookingCode: c.booking_code || null,
    venueName: c.venue_name || null,
    reporterName: c.reporter_name || '',
    reporterPhone: c.reporter_phone || '',
    paidAmount: num(c.paid_amount),
    createdAt: c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : '',
    infoDueAt: c.info_due_at ? new Date(c.info_due_at).toLocaleString('vi-VN') : null,
    infoOverdue: !!c.info_overdue,
    messageCount: num(c.message_count),
  };
}

export function mapReport(r) {
  return {
    bookings: num(r.summary?.bookings),
    cancelled: num(r.summary?.cancelled),
    gmv: num(r.summary?.gross),
    matchedPosts: num(r.summary?.matched_posts),
    openComplaints: num(r.open_complaints),
    occupancy: (r.occupancy || []).map((o) => ({
      label: o.label,
      rate: num(o.rate),
      usedMinutes: num(o.used_minutes),
      capacityMinutes: num(o.capacity_minutes),
    })),
  };
}

// ---------------------------------------------------------------- admin

export function mapOwnerRequest(r, districtName) {
  return {
    id: String(r.id),
    facilityName: r.full_name || `Người dùng #${r.user_id}`,
    ownerName: r.full_name || '',
    phone: r.phone || '',
    address: r.email || '',
    district: districtName(r.district_code),
    submittedAt: r.requested_at ? new Date(r.requested_at).toLocaleString('vi-VN') : '',
    status: r.status === 'APPROVED' ? 'approved' : r.status === 'REJECTED' ? 'rejected' : 'pending',
  };
}

export function mapPendingVenue(v) {
  return {
    id: String(v.id),
    name: v.name,
    address: v.address,
    district: v.district_name || '',
    phone: v.phone || '',
    createdAt: v.created_at ? new Date(v.created_at).toLocaleString('vi-VN') : '',
    ownerName: v.owner_name || '',
    ownerContact: v.owner_phone || v.owner_email || '',
    fields: (v.fields || []).map((f) => `${f.name} (${FIELD_TYPE_TO_PITCH[f.type] || '?'} người)`),
    amenities: v.amenities || [],
    bank: v.bank_account ? `${v.bank_name || ''} · ${v.bank_account} · ${v.bank_holder || ''}` : '',
    depositPercent: Math.round(Number(v.deposit_rate ?? 0) * 100),
  };
}

// Khoảng cách đường chim bay (km)
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// Kèo chia tiền thống nhất trước trận: % tổng chi phí đội thua chịu (hòa luôn chia đôi)
export const DEAL_OPTIONS = [
  { percent: 50, label: 'Chia đôi 50/50', hint: 'Mỗi đội trả một nửa, không phân biệt thắng thua' },
  { percent: 60, label: 'Thua trả 60%', hint: 'Đội thua 60%, đội thắng 40%' },
  { percent: 70, label: 'Thua trả 70%', hint: 'Đội thua 70%, đội thắng 30%' },
  { percent: 100, label: 'Thua trả 100%', hint: 'Đội thua trả toàn bộ tiền sân' },
];
