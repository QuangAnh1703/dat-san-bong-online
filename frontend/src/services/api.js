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

  auth: {
    login: (credentials) => fetchApi('/api/auth/login', post(credentials)),
    registerWithPhone: (data) => fetchApi('/api/auth/register-with-phone', post(data)),
    requestOtp: (email) => fetchApi('/api/auth/request-otp', post({ email })),
    verifyOtp: (email, otp) => fetchApi('/api/auth/verify-otp', post({ email, otp })),
    registerWithOtp: (data) => fetchApi('/api/auth/register-with-otp', post(data)),
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
    updateUserStatus: (id, status) => fetchApi(`/api/admin/users/${id}/status`, put({ status })),
    getComplaints: () => fetchApi('/api/admin/complaints'),
    resolveComplaint: (id, outcome, resolution) =>
      fetchApi(`/api/admin/complaints/${id}/resolve`, post({ outcome, resolution })),
    getReports: () => fetchApi('/api/admin/reports'),
  },

  venues: {
    getAll: () => fetchApi('/api/venues'),
    getFlashSales: () => fetchApi('/api/venues/flash-sales'),
    getById: (id) => fetchApi(`/api/venues/${id}`),
    getRevenue: (id) => fetchApi(`/api/venues/${id}/revenue`),
  },

  fields: {
    getSchedule: (fieldId, date) => fetchApi(`/api/fields/${fieldId}/schedule?date=${date}`),
    create: (data) => fetchApi('/api/fields', post(data)),
    delete: (id) => fetchApi(`/api/fields/${id}`, { method: 'DELETE' }),
  },

  pricing: {
    list: (venueId) => fetchApi(`/api/pricing/${venueId}`),
    update: (venueId, id, data) => fetchApi(`/api/pricing/${venueId}/${id}`, put(data)),
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
    reportTransfer: (bookingCode) => fetchApi('/api/payments', post({ booking_code: bookingCode })),
  },

  complaints: {
    create: (data) => fetchApi('/api/complaints', post(data)),
  },

  community: {
    getPosts: () => fetchApi('/api/community/posts?type=TEAM_FINDS_TEAM&limit=50'),
    createTeamPost: (data) => fetchApi('/api/community/posts', post({ type: 'TEAM_FINDS_TEAM', ...data })),
    sendRequest: (data) => fetchApi('/api/community/requests', post(data)),
    getRequestsForPost: (postId) => fetchApi(`/api/community/requests?post_id=${postId}`),
    respondRequest: (id, status) => fetchApi(`/api/community/requests/${id}`, put({ status })),
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
    getBookings: (venueId) => fetchApi(`/api/owner/bookings?venue_id=${venueId}`),
    confirmBooking: (code) => fetchApi(`/api/owner/bookings/${code}/confirm`, post()),
    rejectBooking: (code, reason) => fetchApi(`/api/owner/bookings/${code}/reject`, post({ reason })),
    lockSlot: (data) => fetchApi('/api/owner/locks', post(data)),
    unlockSlot: (code) => fetchApi(`/api/owner/locks/${code}`, { method: 'DELETE' }),
    getFlashSale: (venueId) => fetchApi(`/api/owner/venues/${venueId}/flash-sale`),
    saveFlashSale: (venueId, data) => fetchApi(`/api/owner/venues/${venueId}/flash-sale`, put(data)),
  },
};
