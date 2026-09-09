/**
 * Lop goi API dung chung cho toan bo frontend.
 * Dev: de trong VITE_API_URL -> Vite proxy /api sang http://localhost:3000
 * Deploy: dat VITE_API_URL tro thang toi backend.
 */
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
  } catch {
    throw new ApiError('Khong ket noi duoc may chu', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || `Loi ${res.status}`, res.status);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};
