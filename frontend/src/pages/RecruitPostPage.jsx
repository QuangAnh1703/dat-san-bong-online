import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { FREELANCE_LEVELS, POSITIONS, costText, formatViDate, levelLabel, positionLabel } from '../services/mappers';

const inputCls =
  'w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none';
const labelCls = 'text-xs text-slate-300 font-semibold block mb-1.5';

const COSTS = [
  { value: 'FREE', label: 'Free', hint: 'Không thu tiền' },
  { value: 'FIXED', label: 'Cố định', hint: 'Mỗi người đóng một khoản' },
  { value: 'VOLUNTARY', label: 'Tự nguyện', hint: 'Góp tùy tâm' },
];

export const RecruitPostPage = () => {
  const { bookings, bookingsLoading, reloadBookings, showToast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Trận sắp tới do mình đặt, chưa có bài tuyển đang mở
  const now = Date.now();
  const options = bookings.filter(
    (b) =>
      !b.isParticipant &&
      !b.sessionsTotal &&
      !b.hasOpenRecruit &&
      ['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.rawStatus) &&
      b.startsAt > now,
  );

  const [bookingCode, setBookingCode] = useState('');
  const [slots, setSlots] = useState(2);
  const [positions, setPositions] = useState(['ANY']);
  const [level, setLevel] = useState('INTERMEDIATE');
  const [costKind, setCostKind] = useState('FIXED');
  const [costAmount, setCostAmount] = useState(30000);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Mở từ "Lịch của tôi" (?booking=BK...) thì chọn sẵn trận đó
  const preset = params.get('booking');
  useEffect(() => {
    if (!bookingCode && options.length) {
      setBookingCode(options.find((b) => b.id === preset)?.id || options[0].id);
    }
  }, [options.length, preset]);

  const booking = options.find((b) => b.id === bookingCode);

  const submit = async (e) => {
    e.preventDefault();
    if (Number(slots) > 10) {
      setError('Số lượng người chơi lẻ cần tuyển tối đa là 10 người/bài đăng');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiClient.freelance.createRecruit({
        booking_code: bookingCode,
        slots_needed: Number(slots),
        positions: positions.length ? positions : ['ANY'],
        required_level: level,
        cost_kind: costKind,
        ...(costKind === 'FIXED' && { cost_amount: Number(costAmount) }),
        content: content.trim(),
      });
      await reloadBookings();
      showToast('Đã đăng bài tuyển người. Bài hiển thị ở tab "Đội bóng tìm người".');
      navigate('/ghep-chan-le?tab=cua-toi');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout
      backTo="/ghep-chan-le"
      backLabel="Về Ghép chân lẻ"
      icon={UserPlus}
      eyebrow="Ghép chân lẻ"
      title="Đăng Bài Tìm Chân Lẻ"
      description="Đội thiếu người? Tuyển thêm người chơi lẻ cho trận đã đặt sân."
    >
      {bookingsLoading && bookings.length === 0 ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lịch đặt...
        </div>
      ) : options.length === 0 ? (
        <Card className="py-14 text-center space-y-3">
          <p className="text-sm font-bold text-white">Bạn chưa có trận sắp tới nào để tuyển người</p>
          <p className="text-xs text-slate-400">Hãy đặt sân trước. Mỗi trận chỉ có một bài tuyển đang mở cùng lúc.</p>
          <Link
            to="/"
            className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Đặt sân ngay
          </Link>
        </Card>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">1. Chọn trận</h2>
              <div>
                <label className={labelCls}>Trận đã đặt</label>
                <select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} className={inputCls}>
                  {options.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.pitchName} · {b.subPitchName} · {formatViDate(b.date)} {b.startTime}-{b.endTime}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">2. Người cần tuyển</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Số người cần tìm (tối đa 10)</label>
                  <input
                    type="number"
                    min={1}
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Yêu cầu trình độ</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                    {FREELANCE_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Vị trí ưu tiên</label>
                <ChoiceChips options={POSITIONS} value={positions} onChange={setPositions} />
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-base font-bold text-white">3. Chi phí & ghi chú</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {COSTS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={costKind === c.value}
                    onClick={() => setCostKind(c.value)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      costKind === c.value
                        ? 'bg-emerald-950 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-sm">{c.label}</div>
                    <div className="text-[0.8125rem] mt-0.5 opacity-80">{c.hint}</div>
                  </button>
                ))}
              </div>
              {costKind === 'FIXED' && (
                <div>
                  <label className={labelCls}>Số tiền mỗi người (đ)</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Ghi chú (không bắt buộc)</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: Đội văn phòng, đá vui vẻ, thiếu hậu vệ"
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-24 space-y-3 text-xs">
            <h2 className="text-base font-bold text-white">Tóm tắt bài đăng</h2>
            <div className="space-y-2 text-slate-400">
              <Row label="Sân" value={booking ? `${booking.pitchName} · ${booking.subPitchName}` : '—'} />
              <Row
                label="Giờ đá"
                value={booking ? `${formatViDate(booking.date)} · ${booking.startTime} - ${booking.endTime}` : '—'}
              />
              <Row label="Cần tuyển" value={`${slots || 0} người`} />
              <Row label="Vị trí" value={(positions.length ? positions : ['ANY']).map(positionLabel).join(', ')} />
              <Row label="Trình độ" value={levelLabel(level)} />
              <Row label="Chi phí" value={costText(costKind, costAmount)} highlight />
            </div>
            <p className="pt-3 border-t border-slate-800 text-[0.8125rem] text-slate-500">
              Bài tự đóng khi đủ người hoặc khi tới giờ bóng lăn.
            </p>
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={sending || !booking}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <UserPlus className="w-4 h-4" />
              <span>{sending ? 'Đang đăng...' : 'Đăng bài tuyển người'}</span>
            </button>
          </Card>
        </form>
      )}
    </PageLayout>
  );
};

const Row = ({ label, value, highlight }) => (
  <div className="flex justify-between gap-3">
    <span className="shrink-0">{label}:</span>
    <span className={`font-semibold text-right ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</span>
  </div>
);
