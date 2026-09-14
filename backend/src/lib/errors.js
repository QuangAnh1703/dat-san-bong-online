'use strict';

/**
 * Bo ma loi dung chung cho toan he thong.
 *
 * Quy uoc: moi loi tra ve cho client deu co dang
 *   { error: { code, message, details?, requestId, timestamp } }
 *
 * - code    : ma on dinh, frontend dua vao day de xu ly (KHONG doi khi sua text)
 * - message : cau tieng Viet hien cho nguoi dung
 * - details : thong tin phu de debug hoac to mau o input bi sai
 */
const ERRORS = {
  // --- 400 Du lieu dau vao ---
  VALIDATION_ERROR:   { status: 400, message: 'Du lieu gui len khong hop le' },
  MISSING_FIELD:      { status: 400, message: 'Thieu truong bat buoc' },
  INVALID_TIME_RANGE: { status: 400, message: 'Khung gio khong hop le' },
  CONSTRAINT_VIOLATED:{ status: 400, message: 'Du lieu vi pham rang buoc nghiep vu' },

  // --- 401 / 403 ---
  UNAUTHENTICATED:    { status: 401, message: 'Ban can dang nhap' },
  FORBIDDEN:          { status: 403, message: 'Ban khong co quyen thuc hien' },

  // --- 404 ---
  NOT_FOUND:          { status: 404, message: 'Khong tim thay du lieu' },
  VENUE_NOT_FOUND:    { status: 404, message: 'Khong tim thay cum san' },
  FIELD_NOT_FOUND:    { status: 404, message: 'San khong ton tai hoac dang tam ngung' },
  BOOKING_NOT_FOUND:  { status: 404, message: 'Khong tim thay don dat san' },
  ROUTE_NOT_FOUND:    { status: 404, message: 'Khong co endpoint nay' },

  // --- 409 Xung dot nghiep vu ---
  SLOT_TAKEN:         { status: 409, message: 'Khung gio nay da co nguoi dat' },
  VENUE_NOT_APPROVED: { status: 409, message: 'Cum san chua duoc duyet' },
  NO_PRICE_RULE:      { status: 409, message: 'Chua co bang gia cho khung gio nay' },
  INVALID_STATUS:     { status: 409, message: 'Don dang o trang thai khong cho phep thao tac nay' },
  HOLD_EXPIRED:       { status: 409, message: 'Da qua thoi gian giu cho' },

  // --- 5xx ---
  DB_UNAVAILABLE:     { status: 503, message: 'Khong ket noi duoc co so du lieu' },
  INTERNAL_ERROR:     { status: 500, message: 'Loi may chu' },
  NOT_IMPLEMENTED:    { status: 501, message: 'Chuc nang chua duoc trien khai' },
};

class AppError extends Error {
  /**
   * @param {keyof ERRORS} code   Ma loi trong bang ERRORS
   * @param {object}  [options]
   * @param {string}  [options.message] Ghi de cau thong bao mac dinh
   * @param {object}  [options.details] Thong tin phu (truong nao sai, rang buoc nao...)
   * @param {Error}   [options.cause]   Loi goc, chi ghi log chu khong tra ve client
   */
  constructor(code, options = {}) {
    const def = ERRORS[code] || ERRORS.INTERNAL_ERROR;
    super(options.message || def.message);
    this.name = 'AppError';
    this.code = ERRORS[code] ? code : 'INTERNAL_ERROR';
    this.status = def.status;
    this.details = options.details;
    this.cause = options.cause;
  }
}

/** Ma loi PostgreSQL -> AppError tuong ung */
function fromDbError(err) {
  switch (err.code) {
    case '23P01': // exclusion_violation: hai don giu cung khung gio
      return new AppError('SLOT_TAKEN', { cause: err });
    case '23514': // check_violation
      return new AppError('CONSTRAINT_VIOLATED', {
        message: 'Du lieu vi pham rang buoc (thoi luong 1-4 gio, so dien thoai 10 so...)',
        details: { constraint: err.constraint },
        cause: err,
      });
    case '23505': // unique_violation
      return new AppError('CONSTRAINT_VIOLATED', {
        message: 'Du lieu da ton tai',
        details: { constraint: err.constraint },
        cause: err,
      });
    case '23503': // foreign_key_violation
      return new AppError('VALIDATION_ERROR', {
        message: 'Du lieu tham chieu toi ban ghi khong ton tai',
        details: { constraint: err.constraint },
        cause: err,
      });
    case 'ECONNREFUSED':
    case '57P03': // cannot_connect_now
      return new AppError('DB_UNAVAILABLE', { cause: err });
    default:
      return null; // khong nhan ra -> de errorHandler tra INTERNAL_ERROR
  }
}

/** Kiem tra cac truong bat buoc, thieu thi nem MISSING_FIELD kem danh sach */
function requireFields(source, fields) {
  const missing = fields.filter((f) => source?.[f] === undefined || source?.[f] === null || source?.[f] === '');
  if (missing.length) {
    throw new AppError('MISSING_FIELD', {
      message: `Thieu truong bat buoc: ${missing.join(', ')}`,
      details: { missing },
    });
  }
}

module.exports = { AppError, ERRORS, fromDbError, requireFields };
