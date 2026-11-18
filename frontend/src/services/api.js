// Lớp gọi API dùng chung. Dev: để trống VITE_API_URL -> Vite proxy /api sang http://localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh';

const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: chỉ giữ phiên trong bộ nhớ */
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const tokenStore = {
  key: TOKEN_KEY,
  get: () => storage.get(TOKEN_KEY),
  set: (access, refresh) => {
    storage.set(TOKEN_KEY, access);
    if (refresh) storage.set(REFRESH_KEY, refresh);
  },
  clear: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(REFRESH_KEY);
  },
};

export const SESSION_EXPIRED_EVENT = 'sanbong:session-expired';

// Lỗi theo định dạng chuẩn của backend: { error: { code, message, details, requestId } }
export class ApiError extends Error {
  code;
  status;
  details;

  constructor(code, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const TOKEN_ERRORS = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED', 'UNAUTHENTICATED'];

// Nhiều request cùng hết hạn một lúc chỉ gọi refresh một lần
let refreshing = null;

function refreshSession() {
  const refresh = storage.get(REFRESH_KEY);
  if (!refresh) return Promise.resolve(false);
  refreshing ??= fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = await res.json();
      tokenStore.set(body.access_token, body.refresh_token);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function fetchApi(endpoint, options = {}, retried = false) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.', 0);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const e = payload?.error;
    // 502/503/504 không kèm JSON chuẩn: Vite proxy / reverse proxy không gọi được backend (tắt hoặc đang khởi động lại)
    if (!e && [502, 503, 504].includes(res.status)) {
      throw new ApiError('NETWORK_ERROR', 'Không kết nối được máy chủ, vui lòng thử lại sau giây lát.', res.status);
    }
    const code = e?.code || 'UNKNOWN';
    const message = e?.message || res.statusText || 'Yêu cầu thất bại';

    // Access token chỉ sống 15 phút: thử đổi refresh token rồi gọi lại một lần
    if (token && !retried && TOKEN_ERRORS.includes(code)) {
      if (await refreshSession()) return fetchApi(endpoint, options, true);
      tokenStore.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return fetchApi(endpoint, options, true);
    }

    throw new ApiError(code, message, res.status, e?.details);
  }

  return payload;
}

const post = (body) => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});
const put = (body) => ({ method: 'PUT', body: JSON.stringify(body) });

export const apiClient = {
  getHealth: () => fetchApi('/health'),
  getDistricts: () => fetchApi('/api/districts'),
  getAmenities: () => fetchApi('/api/amenities'),

  auth: {
    login: (credentials) => fetchApi('/api/auth/login', post(credentials)),
    registerWithPhone: (data) => fetchApi('/api/auth/register-with-phone', post(data)),
    requestOtp: (email) => fetchApi('/api/auth/request-otp', post({ email })),
    verifyOtp: (email, otp) => fetchApi('/api/auth/verify-otp', post({ email, otp })),
    registerWithOtp: (data) => fetchApi('/api/auth/register-with-otp', post(data)),
    forgotPassword: (email) => fetchApi('/api/auth/forgot-password', post({ email })),
    verifyResetOtp: (email, otp) => fetchApi('/api/auth/verify-reset-otp', post({ email, otp })),
    resetPassword: (tempToken, password) =>
      fetchApi('/api/auth/reset-password', post({ temp_token: tempToken, password })),
    // Chuyển hẳn trang sang backend; backend redirect về /auth/google-callback kèm token
    googleLoginUrl: () => `${BASE_URL}/api/auth/google`,
  },

  profile: {
    get: () => fetchApi('/api/profile'),
    update: (data) => fetchApi('/api/profile', put(data)),
  },

  teams: {
    getMine: () => fetchApi('/api/teams/me'),
    save: (data) => fetchApi('/api/teams/me', put(data)),
  },

  admin: {
    getPendingVenues: () => fetchApi('/api/admin/venues/pending?limit=100'),
    approveVenue: (id) => fetchApi(`/api/admin/venues/${id}/approve`, post()),
    rejectVenue: (id, reason) => fetchApi(`/api/admin/venues/${id}/reject`, post({ reason })),
    getStats: () => fetchApi('/api/admin/stats'),
    getOwnerRequests: () => fetchApi('/api/admin/owner-requests?limit=100'),
    approveOwnerRequest: (id) => fetchApi(`/api/admin/owner-requests/${id}/approve`, post()),
    rejectOwnerRequest: (id, reason) => fetchApi(`/api/admin/owner-requests/${id}/reject`, post({ reason })),
    getUsers: () => fetchApi('/api/admin/users?limit=100'),
    updateUserRole: (id, role) => fetchApi(`/api/admin/users/${id}/role`, put({ role })),
    updateUserStatus: (id, status, confirm = false) =>
      fetchApi(`/api/admin/users/${id}/status`, put({ status, confirm })),
    getComplaints: () => fetchApi('/api/admin/complaints'),
    getComplaint: (id) => fetchApi(`/api/admin/complaints/${id}`),
    requestComplaintInfo: (id, message) => fetchApi(`/api/admin/complaints/${id}/request-info`, post({ message })),
    // extra: { penalty_user_id, penalty_points, lock_user_id }
    resolveComplaint: (id, outcome, resolution, extra = {}) =>
      fetchApi(`/api/admin/complaints/${id}/resolve`, post({ outcome, resolution, ...extra })),
    getReports: (range = {}) => fetchApi(`/api/admin/reports?${new URLSearchParams(range)}`),
    // Kho tri thức của trợ lý (RAG)
    knowledge: {
      list: (params = {}) => fetchApi(`/api/admin/knowledge?${new URLSearchParams(params)}`),
      search: (q, role) => fetchApi(`/api/admin/knowledge/search?${new URLSearchParams({ q, role })}`),
      create: (data) => fetchApi('/api/admin/knowledge', post(data)),
      update: (id, data) => fetchApi(`/api/admin/knowledge/${id}`, put(data)),
      remove: (id) => fetchApi(`/api/admin/knowledge/${id}`, { method: 'DELETE' }),
    },
    exportReport: async (range) => {
      // CSV tải trực tiếp (<= 1 năm) hoặc 202 khi báo cáo được gửi qua email
      const token = tokenStore.get();
      const res = await fetch(`${BASE_URL}/api/admin/reports/export?${new URLSearchParams(range)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 202) return { queued: true, ...(await res.json()) };
      if (!res.ok) {
        const e = (await res.json().catch(() => null))?.error;
        throw new ApiError(e?.code || 'UNKNOWN', e?.message || 'Xuất báo cáo thất bại', res.status, e?.details);
      }
      return { queued: false, blob: await res.blob() };
    },
  },

  venues: {
    getAll: (date) => fetchApi(`/api/venues${date ? `?date=${date}` : ''}`),
    getFlashSales: () => fetchApi('/api/venues/flash-sales'),
    getById: (id) => fetchApi(`/api/venues/${id}`),
    getRevenue: (id) => fetchApi(`/api/venues/${id}/revenue`),
    create: (data) => fetchApi('/api/venues', post(data)),
    update: (id, data) => fetchApi(`/api/venues/${id}`, put(data)),
  },

  fields: {
    getSchedule: (fieldId, date) => fetchApi(`/api/fields/${fieldId}/schedule?date=${date}`),
    create: (data) => fetchApi('/api/fields', post(data)),
    delete: (id) => fetchApi(`/api/fields/${id}`, { method: 'DELETE' }),
  },

  pricing: {
    list: (venueId) => fetchApi(`/api/pricing/${venueId}`),
    update: (venueId, id, data) => fetchApi(`/api/pricing/${venueId}/${id}`, put(data)),
    create: (venueId, data) => fetchApi(`/api/pricing/${venueId}`, post(data)),
    remove: (venueId, id) => fetchApi(`/api/pricing/${venueId}/${id}`, { method: 'DELETE' }),
  },

  bookings: {
    getMine: () => fetchApi('/api/bookings'),
    getByCode: (code) => fetchApi(`/api/bookings/${code}`),
    create: (data) => fetchApi('/api/bookings', post(data)),
    createRecurring: (data) => fetchApi('/api/bookings/recurring', post(data)),
    cancel: (code, reason) => fetchApi(`/api/bookings/${code}/cancel`, post({ reason })),
    rate: (code, body) => fetchApi(`/api/bookings/${code}/rate`, post(body)),
  },

  payments: {
    sepayInfo: (bookingCode) => fetchApi(`/api/payments/sepay/${encodeURIComponent(bookingCode)}`),
  },

  pos: {
    services: (venueId) => fetchApi(`/api/owner/venues/${venueId}/services`),
    createService: (venueId, data) => fetchApi(`/api/owner/venues/${venueId}/services`, post(data)),
    updateService: (id, data) => fetchApi(`/api/owner/services/${id}`, put(data)),
    board: (venueId) => fetchApi(`/api/owner/venues/${venueId}/pos`),
    createOrder: (venueId, data) => fetchApi(`/api/owner/venues/${venueId}/pos-orders`, post(data)),
    checkoutSummary: (code) => fetchApi(`/api/owner/bookings/${code}/checkout`),
    checkout: (code, data) => fetchApi(`/api/owner/bookings/${code}/checkout`, post(data)),
  },

  splits: {
    mine: () => fetchApi('/api/splits/mine'),
    get: (code) => fetchApi(`/api/splits/booking/${code}`),
    candidates: (code) => fetchApi(`/api/splits/booking/${code}/candidates`),
    create: (code, data) => fetchApi(`/api/splits/booking/${code}`, post(data)),
    markPaid: (id) => fetchApi(`/api/splits/shares/${id}/mark-paid`, post()),
    payFor: (id) => fetchApi(`/api/splits/shares/${id}/pay-for`, post()),
    reassign: (id, data) => fetchApi(`/api/splits/shares/${id}/reassign`, post(data)),
  },

  wallets: {
    plans: (venueId) => fetchApi(`/api/wallets/venues/${venueId}/plans`),
    mine: () => fetchApi('/api/wallets/mine'),
    myAtVenue: (venueId) => fetchApi(`/api/wallets/venues/${venueId}/me`),
    ownerPlans: (venueId) => fetchApi(`/api/wallets/owner/venues/${venueId}/plans`),
    createPlan: (venueId, data) => fetchApi(`/api/wallets/owner/venues/${venueId}/plans`, post(data)),
    updatePlan: (id, data) => fetchApi(`/api/wallets/owner/plans/${id}`, put(data)),
    frozen: () => fetchApi('/api/wallets/admin/frozen'),
    adminRefund: (id, note) => fetchApi(`/api/wallets/admin/${id}/refund`, post({ note })),
  },

  league: {
    leaderboard: (sort, district) =>
      fetchApi(`/api/leaderboard?sort=${sort}${district ? `&district=${encodeURIComponent(district)}` : ''}`),
    myResults: () => fetchApi('/api/matches/results/mine'),
    pendingResults: () => fetchApi('/api/matches/results/pending'),
    recordResult: (code, home, away) =>
      fetchApi(`/api/matches/${code}/result`, post({ home_score: home, away_score: away })),
    tournaments: (params = '') => fetchApi(`/api/tournaments${params}`),
    tournament: (id) => fetchApi(`/api/tournaments/${id}`),
    createTournament: (data) => fetchApi('/api/tournaments', post(data)),
    register: (id) => fetchApi(`/api/tournaments/${id}/register`, post()),
    schedule: (id) => fetchApi(`/api/tournaments/${id}/schedule`, post()),
    matchResult: (id, home, away) =>
      fetchApi(`/api/tournaments/matches/${id}/result`, post({ home_score: home, away_score: away })),
    forfeit: (id, teamId) => fetchApi(`/api/tournaments/matches/${id}/forfeit`, post(teamId ? { team_id: teamId } : {})),
  },

  chatbot: {
    // messages: [{ role: 'user' | 'assistant', content }] - server không lưu lịch sử, gửi lại cả hội thoại
    send: (messages) => fetchApi('/api/chatbot/messages', post({ messages })),
  },

  complaints: {
    create: (data) => fetchApi('/api/complaints', post(data)),
    getMine: () => fetchApi('/api/complaints/me'),
    get: (id) => fetchApi(`/api/complaints/${id}`),
    reply: (id, data) => fetchApi(`/api/complaints/${id}/messages`, post(data)),
  },

  community: {
    getPosts: () => fetchApi('/api/community/posts?type=TEAM_FINDS_TEAM&limit=50'),
    createTeamPost: (data) => fetchApi('/api/community/posts', post({ type: 'TEAM_FINDS_TEAM', ...data })),
    sendRequest: (data) => fetchApi('/api/community/requests', post(data)),
    getRequestsForPost: (postId) => fetchApi(`/api/community/requests?post_id=${postId}`),
    respondRequest: (id, status) => fetchApi(`/api/community/requests/${id}`, put({ status })),
    getConversations: () => fetchApi('/api/community/conversations'),
    getMessages: (id, after = 0) => fetchApi(`/api/community/conversations/${id}/messages?after=${after}`),
    sendMessage: (id, content) => fetchApi(`/api/community/conversations/${id}/messages`, post({ content })),
  },

  freelance: {
    getRecruits: (filters) => fetchApi(`/api/freelance/recruits?${new URLSearchParams(filters)}`),
    createRecruit: (data) => fetchApi('/api/freelance/recruits', post(data)),
    apply: (postId, data) => fetchApi(`/api/freelance/recruits/${postId}/apply`, post(data)),
    getPlayers: (filters) => fetchApi(`/api/freelance/players?${new URLSearchParams(filters)}`),
    createPlayerPost: (data) => fetchApi('/api/freelance/players', post(data)),
    invite: (postId, data) => fetchApi(`/api/freelance/players/${postId}/invite`, post(data)),
    getRequests: (postId) => fetchApi(`/api/freelance/posts/${postId}/requests`),
    closePost: (postId) => fetchApi(`/api/freelance/posts/${postId}/close`, post()),
    respond: (requestId, status) => fetchApi(`/api/freelance/requests/${requestId}`, put({ status })),
    leave: (bookingCode) => fetchApi(`/api/freelance/matches/${bookingCode}/leave`, post()),
    getMine: () => fetchApi('/api/freelance/me'),
  },

  notifications: {
    list: () => fetchApi('/api/notifications?limit=20'),
    markRead: (ids) => fetchApi('/api/notifications/read', post(ids ? { ids } : {})),
  },

  owner: {
    getVenues: () => fetchApi('/api/owner/venues'),
    getBookings: (venueId) => fetchApi(`/api/owner/bookings?venue_id=${venueId}`),
    getReport: (venueId, period) => fetchApi(`/api/owner/reports?venue_id=${venueId}&period=${period}`),
    confirmBooking: (code) => fetchApi(`/api/owner/bookings/${code}/confirm`, post()),
    rejectBooking: (code, reason) => fetchApi(`/api/owner/bookings/${code}/reject`, post({ reason })),
    lockSlot: (data) => fetchApi('/api/owner/locks', post(data)),
    unlockSlot: (code) => fetchApi(`/api/owner/locks/${code}`, { method: 'DELETE' }),
    getFlashSale: (venueId) => fetchApi(`/api/owner/venues/${venueId}/flash-sale`),
    saveFlashSale: (venueId, data) => fetchApi(`/api/owner/venues/${venueId}/flash-sale`, put(data)),
  },
};
