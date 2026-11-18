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
  VALIDATION_ERROR: { status: 400, message: 'Du lieu gui len khong hop le' },
  MISSING_FIELD: { status: 400, message: 'Thieu truong bat buoc' },
  INVALID_TIME_RANGE: { status: 400, message: 'Khung gio khong hop le' },
  CONSTRAINT_VIOLATED: { status: 400, message: 'Du lieu vi pham rang buoc nghiep vu' },
  INVALID_PHONE: { status: 400, message: 'Số điện thoại phải bao gồm đúng 10 chữ số, đầu số di động Việt Nam (VD: 0912345678)' },
  INVALID_EMAIL: { status: 400, message: 'Email khong hop le' },
  WEAK_PASSWORD: { status: 400, message: 'Mật khẩu quá yếu! Dùng ít nhất 8 ký tự gồm cả chữ và số' },
  SLOT_IN_PAST: { status: 400, message: 'Không thể chọn khung giờ đã trôi qua!' },
  OTP_INVALID: { status: 400, message: 'Mã OTP không đúng' },
  OTP_EXPIRED: { status: 400, message: 'Mã OTP đã hết hạn, vui lòng gửi lại mã' },
  INVALID_TEMP_TOKEN: { status: 400, message: 'Phiên xác thực OTP không hợp lệ, vui lòng làm lại' },
  INVALID_FIELD: { status: 400, message: 'Gia tri truong khong hop le' },
  INVALID_RATING: { status: 400, message: 'Diem danh gia phai tu 1 den 5' },
  INVALID_OPERATION: { status: 400, message: 'Thao tac khong hop le' },
  CANNOT_RATE: { status: 400, message: 'Chi danh gia duoc tran da da xong' },
  TEAM_REQUIRED: { status: 400, message: 'Ban can tao doi bong trong ho so truoc' },
  RECRUIT_LIMIT_EXCEEDED: { status: 400, message: 'Số lượng người chơi lẻ cần tuyển tối đa là 10 người/bài đăng' },

  // --- 401 / 403 ---
  UNAUTHENTICATED: { status: 401, message: 'Ban can dang nhap' },
  UNAUTHORIZED: { status: 401, message: 'Ban can dang nhap' },
  TOKEN_EXPIRED: { status: 401, message: 'Phien dang nhap da het han' },
  INVALID_TOKEN: { status: 401, message: 'Token khong hop le' },
  FORBIDDEN: { status: 403, message: 'Ban khong co quyen thuc hien' },
  INVALID_CREDENTIALS: { status: 401, message: 'So dien thoai hoac mat khau khong dung' },
  ACCOUNT_LOCKED: { status: 403, message: 'Tai khoan da bi khoa, vui long lien he quan tri vien' },
  GOOGLE_LOGIN_FAILED: { status: 401, message: 'Dang nhap Google that bai' },
  BANK_WEBHOOK_UNAUTHORIZED: { status: 401, message: 'Webhook ngan hang sai khoa xac thuc' },

  // --- 404 ---
  NOT_FOUND: { status: 404, message: 'Khong tim thay du lieu' },
  VENUE_NOT_FOUND: { status: 404, message: 'Khong tim thay cum san' },
  FIELD_NOT_FOUND: { status: 404, message: 'San khong ton tai hoac dang tam ngung' },
  BOOKING_NOT_FOUND: { status: 404, message: 'Khong tim thay don dat san' },
  ROUTE_NOT_FOUND: { status: 404, message: 'Khong co endpoint nay' },
  USER_NOT_FOUND: { status: 404, message: 'Khong tim thay nguoi dung' },
  POST_NOT_FOUND: { status: 404, message: 'Khong tim thay bai dang' },
  REQUEST_NOT_FOUND: { status: 404, message: 'Khong tim thay loi moi' },
  KB_ARTICLE_NOT_FOUND: { status: 404, message: 'Không tìm thấy bài viết trong kho tri thức' },
  TICKET_NOT_FOUND: { status: 404, message: 'Khong tim thay khieu nai' },
  TRANSACTION_NOT_FOUND: { status: 404, message: 'Không tìm thấy giao dịch chuyển khoản' },
  OWNER_REQUEST_NOT_FOUND: { status: 404, message: 'Khong tim thay yeu cau chu san' },
  VENUE_NOT_FOUND_OR_NOT_PENDING: {
    status: 404,
    message: 'Cum san khong ton tai hoac khong o trang thai cho duyet',
  },

  // --- 409 Xung dot nghiep vu ---
  SLOT_TAKEN: { status: 409, message: 'Khung gio nay da co nguoi dat' },
  PHONE_TAKEN: { status: 409, message: 'So dien thoai nay da duoc dang ky' },
  EMAIL_TAKEN: { status: 409, message: 'Email nay da duoc dang ky' },
  VENUE_NOT_APPROVED: { status: 409, message: 'Cum san chua duoc duyet' },
  NO_PRICE_RULE: { status: 409, message: 'Chua co bang gia cho khung gio nay' },
  INVALID_STATUS: { status: 409, message: 'Don dang o trang thai khong cho phep thao tac nay' },
  HOLD_EXPIRED: { status: 409, message: 'Da qua thoi gian giu cho' },
  BOOKING_ALREADY_STARTED: { status: 409, message: 'Da qua gio bat dau tran, khong the huy lich' },
  PRICE_SLOT_OVERLAP: { status: 409, message: 'Khung gio gia bi chong lap voi khung gio khac' },
  REQUEST_ALREADY_EXISTS: { status: 409, message: 'Ban da gui loi moi cho bai dang nay' },
  OWNER_REQUEST_ALREADY_PENDING: { status: 409, message: 'Ban da co yeu cau dang cho duyet' },
  OWNER_REQUEST_NOT_PENDING: { status: 409, message: 'Yeu cau khong con o trang thai cho duyet' },
  ALREADY_RATED: { status: 409, message: 'Ban da danh gia tran nay roi' },
  RECRUIT_FULL: { status: 409, message: 'Đội bóng đã tuyển đủ người. Vui lòng chọn bài đăng khác!' },
  RECRUIT_POST_EXISTS: { status: 409, message: 'Trận này đã có bài tuyển người đang mở' },
  LEVEL_MISMATCH: { status: 409, message: 'Trình độ của bạn chưa đạt yêu cầu của bài đăng. Bạn vẫn muốn gửi yêu cầu?' },
  PLAYER_POST_OVERLAP: { status: 409, message: 'Bạn đã có bài đăng tìm đội trong khoảng thời gian này!' },
  INVITE_EXPIRED: { status: 409, message: 'Lời mời đã hết hạn (quá 30 phút không phản hồi)' },
  ALREADY_IN_MATCH: { status: 409, message: 'Bạn đã có tên trong danh sách trận này' },
  SCHEDULE_CONFLICT: { status: 409, message: 'Đội của bạn đã có một lịch đá khác vào khung giờ này!' },
  MATCH_TOO_SOON: { status: 409, message: 'Trận đấu sắp diễn ra, không đủ thời gian tìm đối thủ!' },
  POST_NOT_OPEN: { status: 409, message: 'Bai dang da dong' },
  OUT_OF_STOCK: { status: 409, message: 'Mặt hàng đã hết trong kho' },
  RENTAL_CHECK_REQUIRED: { status: 409, message: 'Đơn có đồ cho thuê, hãy kiểm tra khách đã trả đủ đồ trước khi check-out' },
  SPLIT_EXISTS: { status: 409, message: 'Trận này đã được chia tiền' },
  SPLIT_AMOUNT_MISMATCH: { status: 400, message: 'Tổng số tiền chia chưa khớp tổng chi phí trận' },
  WALLET_EMPTY: { status: 409, message: 'Ví hội viên chưa có số dư tại cụm sân này' },
  WALLET_FROZEN: { status: 409, message: 'Ví hội viên đang bị đóng băng, chờ quản trị viên hoàn trả' },
  TOURNAMENT_BANNED: { status: 409, message: 'Đội của bạn đang bị cấm đăng ký giải' },
  TOURNAMENT_FULL: { status: 409, message: 'Giải đã đủ số đội' },
  TRANSACTION_ALREADY_HANDLED: { status: 409, message: 'Giao dịch này đã được xử lý' },
  RECURRING_CONFLICT: { status: 409, message: 'Mot so buoi trong lich dinh ky da co nguoi dat' },

  // --- 429 Rate limit ---
  OTP_RATE_LIMITED: { status: 429, message: 'Đã nhập sai quá nhiều lần. Tạm khóa gửi OTP 15 phút' },
  CHATBOT_RATE_LIMITED: { status: 429, message: 'Bạn hỏi trợ lý hơi nhiều, vui lòng thử lại sau ít phút' },
  OWNER_HAS_UPCOMING_BOOKINGS: { status: 409, message: 'Chủ sân đang có đơn đặt chưa diễn ra' },

  // --- 5xx ---
  DB_UNAVAILABLE: { status: 503, message: 'Khong ket noi duoc co so du lieu' },
  INTERNAL_ERROR: { status: 500, message: 'Loi may chu' },
  NOT_IMPLEMENTED: { status: 501, message: 'Chuc nang chua duoc trien khai' },
  PAYMENT_GATEWAY_NOT_CONFIGURED: { status: 503, message: 'Cổng thanh toán chưa được cấu hình' },
  CHATBOT_NOT_CONFIGURED: { status: 503, message: 'Trợ lý đặt sân chưa được cấu hình' },
  EMAIL_SEND_FAILED: { status: 503, message: 'Không gửi được email, vui lòng thử lại sau hoặc đăng ký bằng số điện thoại' },
  CHATBOT_UNAVAILABLE: { status: 502, message: 'Trợ lý đặt sân đang bận, vui lòng thử lại sau' },
  GOOGLE_OAUTH_NOT_CONFIGURED: { status: 503, message: 'Dang nhap Google chua duoc cau hinh' },
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
    case '23P01': // exclusion_violation: hai don giu cung khung gio hoac khung gia bi chong lap
      // Check constraint name to distinguish between SLOT_TAKEN and PRICE_SLOT_OVERLAP
      if (err.constraint === 'no_price_overlap') {
        return new AppError('PRICE_SLOT_OVERLAP', {
          message: 'Khung giờ cài đặt giá bị chồng lấp với khung giờ khác',
          cause: err,
        });
      }
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
    case '23502': // not_null_violation
      return new AppError('MISSING_FIELD', {
        message: `Thieu truong bat buoc: ${err.column}`,
        details: { missing: [err.column] },
        cause: err,
      });
    case '23503': // foreign_key_violation
      return new AppError('VALIDATION_ERROR', {
        message: 'Du lieu tham chieu toi ban ghi khong ton tai',
        details: { constraint: err.constraint },
        cause: err,
      });
    // Tham so sai dinh dang (id "abc" -> NaN, ngay 2026-13-45, gio "xx") lot xuong CSDL: loi cua client, khong phai 500
    case '22P02': // invalid_text_representation
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
    case '22003': // numeric_value_out_of_range
      return new AppError('VALIDATION_ERROR', {
        message: 'Tham số không đúng định dạng (số, ngày YYYY-MM-DD hoặc giờ HH:MM)',
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
  const missing = fields.filter(
    (f) => source?.[f] === undefined || source?.[f] === null || source?.[f] === ''
  );
  if (missing.length) {
    throw new AppError('MISSING_FIELD', {
      message: `Thieu truong bat buoc: ${missing.join(', ')}`,
      details: { missing },
    });
  }
}

module.exports = { AppError, ERRORS, fromDbError, requireFields };
