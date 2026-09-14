/**
 * Lop goi API dung chung cho toan bo frontend.
 * Dev: de trong VITE_API_URL -> Vite proxy /api sang http://localhost:3000
 * Deploy: dat VITE_API_URL tro thang toi backend.
 */
const BASE = import.meta.env.VITE_API_URL || '';

/**
 * Loi tra ve tu backend theo dinh dang chuan:
 *   { error: { code, message, details?, requestId, timestamp } }
 *
 * Dung `err.code` de xu ly theo tinh huong (vd. SLOT_TAKEN thi load lai lich),
 * dung `err.message` de hien cho nguoi dung.
 */
export class ApiError extends Error {
  constructor({ code, message, details, requestId, status }) {
    super(message || 'Da co loi xay ra');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN';
    this.details = details;
    this.requestId = requestId;
    this.status = status;
  }

  /** Loi mang: khong goi duoc toi server */
  get isNetworkError() {
    return this.code === 'NETWORK_ERROR';
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Khong ket noi duoc may chu',
      status: 0,
    });
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const e = payload?.error;
    throw new ApiError({
      code: e?.code,
      message: e?.message,
      details: e?.details,
      requestId: e?.requestId,
      status: res.status,
    });
  }

  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
