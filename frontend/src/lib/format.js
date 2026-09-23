/** Dinh dang tien Viet Nam: 250000 -> "250.000d" */
export const vnd = (n) => Number(n || 0).toLocaleString('vi-VN') + 'd';

/** Ngay hom nay dang YYYY-MM-DD (dung cho input type=date) */
export const today = () => new Date().toISOString().slice(0, 10);

/** Cong them N ngay vao ngay hien tai (dang YYYY-MM-DD) */
export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** 5025 giay -> "01:23:45" */
export function hms(totalSeconds) {
  const p = (n) => String(n).padStart(2, '0');
  return [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ].map(p).join(':');
}
