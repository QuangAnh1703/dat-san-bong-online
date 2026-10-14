import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, AlertCircle, Loader2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { SKILL_LABELS, formatViDate, todayISO } from '../services/mappers';

const inputCls =
  'w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none';
const labelCls = 'text-xs text-slate-300 font-semibold block mb-1.5';

const DEALS = [
  { value: 'Chia đôi tiền sân 50/50', hint: 'Mỗi đội trả một nửa' },
  { value: 'Thua trả 100% tiền sân', hint: 'Đội thua trả toàn bộ' },
  { value: 'Giao lưu vui vẻ 1 két nước', hint: 'Đội thua mời nước' },
];

export const ChallengePostPage = () => {
  const { user, bookings, bookingsLoading, createChallenge } = useApp();
  const navigate = useNavigate();

  const options = bookings.filter(
    (b) =>
      !b.isParticipant &&
      ['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.rawStatus) &&
      !b.sessionsTotal &&
      b.date >= todayISO(),
  );

  const [bookingCode, setBookingCode] = useState('');
  const [dealNote, setDealNote] = useState(DEALS[0].value);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingCode && options.length) setBookingCode(options[0].id);
  }, [options.length]);

  const booking = options.find((b) => b.id === bookingCode);

  const submit = async (e) => {
    e.preventDefault();
    if (!booking) return;
    setPosting(true);
    setError(null);
    try {
      await createChallenge(booking.bookingDbId, dealNote, content.trim());
      navigate('/giao-huu');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const layout = (children) => (
    <PageLayout
      backTo="/giao-huu"
      backLabel="Về Cáp kèo & Tìm đối"
      icon={Users}
      eyebrow="Cáp kèo & Tìm đối"
      title="Đăng Tin Tìm Đối Giao Hữu"
      description="Chọn trận đã đặt sân để mời đội khác giao lưu."
    >
      {children}
    </PageLayout>
  );

  if (!user.team) {
    return layout(
      <Card className="py-14 text-center space-y-3">
        <p className="text-sm font-bold text-white">Bạn cần tạo đội bóng trước khi đăng tin tìm đối</p>
        <Link
          to="/ho-so"
          className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
        >
          Tạo đội trong hồ sơ
        </Link>
      </Card>,
    );
  }

  if (bookingsLoading && bookings.length === 0) {
    return layout(
      <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lịch đặt...
      </div>,
    );
  }

  if (options.length === 0) {
    return layout(
      <Card className="py-14 text-center space-y-3">
        <p className="text-sm font-bold text-white">Bạn chưa có trận nào sắp tới</p>
        <p className="text-xs text-slate-400">Hãy đặt sân trước, sau đó đăng tin tìm đối cho trận đó.</p>
        <Link
          to="/"
          className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
        >
          Đặt sân ngay
        </Link>
      </Card>,
    );
  }

  return layout(
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
          <h2 className="text-base font-bold text-white">2. Hình thức chia tiền</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEALS.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={dealNote === d.value}
                onClick={() => setDealNote(d.value)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  dealNote === d.value
                    ? 'bg-emerald-950 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm">{d.value}</div>
                <div className="text-[0.8125rem] mt-0.5 opacity-80">{d.hint}</div>
              </button>
            ))}
          </div>
          <div>
            <label className={labelCls}>Ghi chú thêm (không bắt buộc)</label>
            <textarea
              rows={3}
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: Đội văn phòng, đá vui vẻ, tôn trọng đối thủ"
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-24 space-y-3 text-xs">
        <h2 className="text-base font-bold text-white">Tóm tắt kèo</h2>
        <div className="space-y-2 text-slate-400">
          <Row label="Đội" value={user.team.name} />
          <Row label="Trình độ" value={SKILL_LABELS[user.team.skillLevel]} />
          <Row label="Sân" value={booking ? `${booking.pitchName} · ${booking.subPitchName}` : '—'} />
          <Row
            label="Giờ đá"
            value={booking ? `${formatViDate(booking.date)} · ${booking.startTime} - ${booking.endTime}` : '—'}
          />
          <Row label="Chia tiền" value={dealNote} highlight />
        </div>
        <p className="pt-3 border-t border-slate-800 text-[0.8125rem] text-slate-500">
          Đăng dưới tên đội, trình độ theo hồ sơ đội. Bài tự đóng khi chốt kèo hoặc tới giờ đá.
        </p>
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={posting || !booking}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
        >
          <Users className="w-4 h-4" />
          <span>{posting ? 'Đang đăng...' : 'Đăng tin lên sàn'}</span>
        </button>
      </Card>
    </form>,
  );
};

const Row = ({ label, value, highlight }) => (
  <div className="flex justify-between gap-3">
    <span className="shrink-0">{label}:</span>
    <span className={`font-semibold text-right ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</span>
  </div>
);
