import React, { useEffect, useMemo, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { ApiError } from '../services/api';
import { contractDiscount, formatViDate, minutesToHHMM, SLOT_MINUTES, toLocalISODate } from '../services/mappers';
import { PaymentPanel } from '../components/PaymentPanel';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, PageLayout } from '../components/ui/PageLayout';

const WEEKDAYS = [
  { iso: 1, label: 'T2' },
  { iso: 2, label: 'T3' },
  { iso: 3, label: 'T4' },
  { iso: 4, label: 'T5' },
  { iso: 5, label: 'T6' },
  { iso: 6, label: 'T7' },
  { iso: 7, label: 'CN' },
];

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Liệt kê các buổi giống backend: mọi ngày trong [start, start + months) rơi vào thứ đã chọn
function listSessions(startDate, months, weekdays) {
  if (!startDate || weekdays.length === 0) return [];
  const [y, m, d] = startDate.split('-').map(Number);
  const first = new Date(y, m - 1, d);
  const last = new Date(first);
  last.setMonth(last.getMonth() + months);
  const out = [];
  for (const cur = new Date(first); cur < last; cur.setDate(cur.getDate() + 1)) {
    const iso = ((cur.getDay() + 6) % 7) + 1;
    if (weekdays.includes(iso)) out.push(new Date(cur));
  }
  return out;
}

export const SubscriptionPage = () => {
  const { pitches, isLoggedIn, setIsAuthModalOpen, createRecurringBooking } = useApp();

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalISODate(d);
  }, []);

  const [pitchId, setPitchId] = useState('');
  const [subPitchId, setSubPitchId] = useState('');
  const [weekdays, setWeekdays] = useState([2, 5]);
  const [startTime, setStartTime] = useState('19:30');
  const [startDate, setStartDate] = useState(tomorrow);
  const [durationMonths, setDurationMonths] = useState(3);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Lỗi trùng lịch: cho chọn bỏ qua các ngày trùng, chỉ ký hợp đồng các buổi còn lại
  const [conflict, setConflict] = useState(null);
  const [result, setResult] = useState(null);

  const pitch = pitches.find((p) => p.id === pitchId) || pitches[0];
  const sub = pitch?.subPitches.find((s) => s.id === subPitchId) || pitch?.subPitches[0];

  // Các khung 90 phút trong giờ mở cửa
  const timeOptions = useMemo(() => {
    if (!pitch) return [];
    const opts = [];
    for (let m = toMinutes(pitch.openTime); m + SLOT_MINUTES <= toMinutes(pitch.closeTime); m += SLOT_MINUTES) {
      opts.push(minutesToHHMM(m));
    }
    return opts;
  }, [pitch?.id]);

  useEffect(() => {
    if (timeOptions.length && !timeOptions.includes(startTime)) {
      setStartTime(timeOptions.includes('19:30') ? '19:30' : timeOptions[timeOptions.length - 2] || timeOptions[0]);
    }
  }, [timeOptions]);

  const endTime = minutesToHHMM(toMinutes(startTime) + SLOT_MINUTES);
  const sessions = listSessions(startDate, durationMonths, weekdays);

  // Giá dự kiến theo bảng giá; chiết khấu chính thức do backend quyết định
  const startMin = toMinutes(startTime);
  const priceOf = (date) => {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const rule = pitch?.priceRules.find(
      (r) =>
        r.fieldType === sub?.type &&
        r.dayType === (weekend ? 'WEEKEND' : 'WEEKDAY') &&
        startMin >= r.fromMinute &&
        startMin < r.toMinute,
    );
    return rule ? Math.round((rule.pricePerHour * SLOT_MINUTES) / 60) : null;
  };
  const prices = sessions.map(priceOf);
  const missingPrice = prices.some((p) => p === null);
  const gross = prices.reduce((s, p) => s + (p || 0), 0);
  const discountPercent = pitch ? contractDiscount(pitch, durationMonths) : 0;
  const estimate = Math.round(gross * (1 - discountPercent / 100));

  const toggleDay = (iso) =>
    setWeekdays((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso].sort()));

  const submitBooking = async (skipConflicts) => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!sub) return;
    setSubmitting(true);
    setError(null);
    setConflict(null);
    try {
      setResult(
        await createRecurringBooking({
          subPitchId: sub.id,
          weekdays,
          startDate,
          months: durationMonths,
          startTime,
          endTime,
          note: note.trim() || undefined,
          skipConflicts,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RECURRING_CONFLICT') {
        const dates = err.details?.dates || [];
        setError(
          `Khung giờ ngày ${dates.slice(0, 6).map(formatViDate).join(', ')}${dates.length > 6 ? ` và ${dates.length - 6} buổi khác` : ''} đã có người đặt. Hãy đổi sân con / khung giờ, hoặc bỏ qua các ngày trùng.`,
        );
        setConflict({ count: dates.length, available: err.details?.sessions_available ?? 0 });
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitBooking(false);
  };

  const inputCls =
    'w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer';
  const labelCls = 'text-xs text-slate-300 font-semibold block mb-1.5';

  return (
    <PageLayout
      backTo="/"
      icon={Calendar}
      eyebrow="Chương trình đối tác thân thiết"
      title="Đặt Lịch Cố Định Hàng Tuần"
      description="Giữ cố định khung giờ cho đội bóng quanh năm, được chiết khấu theo thời gian hợp đồng."
    >
      {result ? (
        <div className="max-w-2xl mx-auto space-y-4 text-xs">
          <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
            <div className="space-y-1">
              <div className="font-bold text-white text-base">
                Đã giữ {result.sessions} buổi · Mã {result.code}
              </div>
              <div>
                Tổng hợp đồng {result.total.toLocaleString('vi-VN')}đ (đã giảm {result.discountPercent}%). Tiền cọc{' '}
                <strong>{result.deposit.toLocaleString('vi-VN')}đ</strong>, cần chuyển trong 15 phút để giữ lịch.
              </div>
              {result.skippedDates.length > 0 && (
                <div className="text-emerald-300/80">
                  Đã bỏ qua {result.skippedDates.length} ngày trùng lịch:{' '}
                  {result.skippedDates.map(formatViDate).join(', ')}.
                </div>
              )}
            </div>
          </div>
          <PaymentPanel bookingCode={result.code} />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setResult(null)}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-700"
            >
              Đặt thêm lịch khác
            </button>
            <Link
              to="/lich-cua-toi"
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold text-center"
            >
              Xem lịch của tôi
            </Link>
          </div>
        </div>
      ) : !pitch ? (
        <Card className="py-16 text-center text-sm text-slate-400">Chưa có cụm sân nào đang mở đặt.</Card>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">1. Chọn sân</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cụm sân</label>
                  <select
                    value={pitch.id}
                    onChange={(e) => {
                      setPitchId(e.target.value);
                      setSubPitchId('');
                    }}
                    className={inputCls}
                  >
                    {pitches.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.district})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sân con</label>
                  <select value={sub?.id || ''} onChange={(e) => setSubPitchId(e.target.value)} className={inputCls}>
                    {pitch.subPitches.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (sân {s.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">2. Lịch đá cố định</h2>
              <div>
                <label className={labelCls}>Đá vào các ngày trong tuần</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => toggleDay(d.iso)}
                      className={`h-11 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        weekdays.includes(d.iso)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Khung giờ (90 phút)</label>
                  <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls}>
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t} - {minutesToHHMM(toMinutes(t) + SLOT_MINUTES)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Bắt đầu từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    min={tomorrow}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">3. Gói hợp đồng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 3].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMonths(m)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      durationMonths === m
                        ? 'bg-emerald-950 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{m === 1 ? 'Gói 1 Tháng' : 'Gói 1 Quý (3 tháng)'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300 text-[0.75rem] font-bold">
                        -{contractDiscount(pitch, m)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className={labelCls}>Ghi chú cho chủ sân (không bắt buộc)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Ví dụ: FC Văn Phòng ABC"
                  className="w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </Card>
          </div>

          {/* Tóm tắt chi phí dự kiến */}
          <Card className="lg:sticky lg:top-24 space-y-3 text-xs">
            <h2 className="text-base font-bold text-white">Tóm tắt hợp đồng</h2>
            <div className="space-y-2 text-slate-400">
              <div className="flex justify-between gap-3">
                <span>Sân:</span>
                <span className="text-white font-semibold text-right">
                  {pitch.name} · {sub?.name}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Khung giờ:</span>
                <span className="text-white font-semibold">
                  {startTime} - {endTime}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Số buổi:</span>
                <span className="text-white font-bold text-right">
                  {sessions.length} buổi
                  {sessions.length > 0 && (
                    <span className="block font-normal text-slate-400">
                      {formatViDate(toLocalISODate(sessions[0]))} →{' '}
                      {formatViDate(toLocalISODate(sessions[sessions.length - 1]))}
                    </span>
                  )}
                </span>
              </div>
            </div>
            {missingPrice ? (
              <div className="text-amber-300">Một số buổi chưa có bảng giá cho khung giờ/loại sân này.</div>
            ) : (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Giá niêm yết:</span>
                  <span className="line-through tabular-nums">{gross.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white">
                  <span>Tổng dự kiến (-{discountPercent}%):</span>
                  <span className="text-emerald-400 tabular-nums">{estimate.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="text-[0.8125rem] text-slate-500 text-right">
                  Tiền cọc {Math.round(pitch.depositRate * 100)}% ≈{' '}
                  {Math.round(estimate * pitch.depositRate).toLocaleString('vi-VN')}đ
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
                {conflict?.available > 0 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitBooking(true)}
                    className="w-full py-2 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-semibold cursor-pointer disabled:opacity-60"
                  >
                    Bỏ qua {conflict.count} ngày trùng, chỉ đặt {conflict.available} buổi còn lại
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || sessions.length === 0 || missingPrice}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{!isLoggedIn ? 'Đăng nhập để đặt' : submitting ? 'Đang giữ lịch...' : 'Giữ sân định kỳ'}</span>
            </button>
          </Card>
        </form>
      )}
    </PageLayout>
  );
};
