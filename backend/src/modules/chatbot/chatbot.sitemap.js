'use strict';

// Ban sao bang route cua frontend (frontend/src/App.jsx) theo vai tro. Doi route o App.jsx thi sua ca o day:
// tro ly chi duoc dan link toi cac trang trong danh sach cua vai tro dang chat.
const PLAYER_PAGES = [
  ['/', 'Trang chủ: tìm sân, lọc sân, gợi ý sân gần'],
  ['/san/:id', 'Chi tiết sân, lịch trống, đặt sân và cọc VietQR'],
  ['/dat-dinh-ky', 'Đặt sân định kỳ hằng tuần (1 hoặc 3 tháng)'],
  ['/keo-gap', 'Kèo gấp giá hời (Flash Sale)'],
  ['/giao-huu', 'Cáp kèo, tìm đối giao hữu'],
  ['/giao-huu/dang-tin', 'Đăng tin tìm đối', true],
  ['/ghep-chan-le', 'Ghép chân lẻ (?tab=doi-tim-nguoi | nguoi-tim-doi | cua-toi)'],
  ['/ghep-chan-le/dang-tuyen', 'Đội đăng tuyển chân lẻ', true],
  ['/ghep-chan-le/dang-tin', 'Người chơi đăng tin tìm đội', true],
  ['/bang-xep-hang', 'Bảng xếp hạng Elo (?tab=giai-dau để xem giải đấu)'],
  ['/giai-dau/:id', 'Chi tiết giải đấu, đăng ký tham gia'],
  ['/lich-cua-toi', 'Lịch đã đặt: Sắp đá / Đã đá / Đã hủy, hủy đơn, đánh giá', true],
  ['/chia-tien/:code', 'Chia tiền trận theo mã đơn', true],
  ['/ho-so', 'Hồ sơ và điểm uy tín', true],
  ['/tin-nhan', 'Tin nhắn nhóm trận', true],
  ['/khieu-nai', 'Khiếu nại của tôi', true],
];

const OWNER_PAGES = [
  ['/', 'Dashboard chủ sân'],
  ['/chu-san/don-dat', 'Đơn đặt, nhập tỷ số, check-out'],
  ['/chu-san/lich', 'Lịch sân, khóa sân nhanh, sân con'],
  ['/chu-san/bang-gia', 'Bảng giá, Flash Sale, chiết khấu định kỳ'],
  ['/chu-san/cum-san', 'Danh sách cụm sân'],
  ['/chu-san/cum-san/moi', 'Đăng ký cụm sân mới'],
  ['/chu-san/cum-san/:id', 'Sửa cụm sân, gửi duyệt lại'],
  ['/chu-san/dich-vu', 'Căng-tin POS và kho dịch vụ'],
  ['/chu-san/goi-thanh-vien', 'Gói thành viên trả trước'],
  ['/chu-san/giai-dau', 'Tổ chức giải đấu'],
];

const ADMIN_PAGES = [
  ['/', 'Dashboard quản trị'],
  ['/quan-tri/nguoi-dung', 'Người dùng: vai trò, khóa / mở khóa'],
  ['/quan-tri/chu-san', 'Duyệt yêu cầu chủ sân'],
  ['/quan-tri/cum-san', 'Duyệt cụm sân'],
  ['/quan-tri/khieu-nai', 'Danh sách khiếu nại'],
  ['/quan-tri/khieu-nai/:id', 'Chi tiết khiếu nại'],
  ['/quan-tri/bao-cao', 'Báo cáo hệ thống'],
  ['/quan-tri/vi-hoi-vien', 'Ví hội viên đóng băng'],
  ['/quan-tri/tro-ly', 'Kho tri thức của trợ lý'],
];

const BY_ROLE = { GUEST: PLAYER_PAGES, PLAYER: PLAYER_PAGES, OWNER: OWNER_PAGES, ADMIN: ADMIN_PAGES };

const toRegex = (path) => new RegExp(`^${path.replace(/:[a-z]+/g, '[A-Za-z0-9_-]+')}/?$`);
const COMPILED = Object.fromEntries(
  Object.entries(BY_ROLE).map(([role, pages]) => [role, pages.map(([path]) => toRegex(path))])
);

function sitemapText(role) {
  return (BY_ROLE[role] || PLAYER_PAGES)
    .map(([path, label, auth]) => `- ${path}: ${label}${auth ? ' (cần đăng nhập)' : ''}`)
    .join('\n');
}

function isAllowedPath(role, href) {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split(/[?#]/)[0];
  return (COMPILED[role] || COMPILED.GUEST).some((re) => re.test(path));
}

// Link markdown tro toi trang khong co (hoac cua vai tro khac) -> chi giu chu, bo link
function sanitizeLinks(role, text) {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, href) =>
    isAllowedPath(role, href) ? all : label
  );
}

module.exports = { sitemapText, isAllowedPath, sanitizeLinks };
