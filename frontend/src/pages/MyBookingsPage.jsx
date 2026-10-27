import React, { useEffect, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { formatViDate } from '../services/mappers';
import { PaymentPanel } from '../components/PaymentPanel';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  QrCode,
  Loader2,
  Wallet,
  MessageSquareWarning,
  MessageCircle,
  Star,
  UserPlus,
  MapPin,
  Phone,
  HandCoins,
} from 'lucide-react';
import { PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';
import { MyMatchTasks } from '../components/MyMatchTasks';

const STATUS_LABEL = {
  HELD: { text: 'Đang giữ chỗ · Chờ cọc', cls: 'bg-amber-950 text-amber-400 border border-amber-800' },
  PENDING_VERIFY: {
    text: 'Chờ chủ sân xác nhận cọc',
    cls: 'bg-violet-950 text-violet-300 border border-violet-800',
  },
  CONFIRMED: {
    text: 'Đã xác nhận & Giữ slot',
    cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  },
  IN_PROGRESS: { text: 'Đang thi đấu', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  COMPLETED: { text: 'Đã thi đấu xong', cls: 'bg-slate-800 text-slate-300' },
  CANCELLED_EXPIRED: { text: 'Hết hạn giữ chỗ', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  CANCELLED_BY_USER: { text: 'Đã hủy', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  CANCELLED_BY_OWNER: { text: 'Chủ sân đã hủy', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  REFUNDED: { text: 'Đã hoàn cọc', cls: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
};

// Đơn chưa từng được giữ/cọc thì không có gì để khiếu nại
const CAN_COMPLAIN = ['PENDING_VERIFY', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_OWNER'];
const CANCELLED = ['CANCELLED_EXPIRED', 'CANCELLED_BY_USER', 'CANCELLED_BY_OWNER', 'REFUNDED'];
const PLAYED = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

const TABS = [
  { key: 'upcoming', label: 'Sắp đá', empty: 'Không có trận nào sắp diễn ra.' },
  { key: 'played', label: 'Đã đá', empty: 'Chưa có trận nào đã đá xong.' },
  { key: 'cancelled', label: 'Đã hủy', empty: 'Không có lịch nào bị hủy.' },
];

const bookingGroup = (b, now) => {
  if (CANCELLED.includes(b.rawStatus)) return 'cancelled';
  if (b.endsAt !== undefined && b.endsAt <= now) return 'played';
  return 'upcoming';
};

const StarInput = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-300">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${label} ${n} sao`}
          className="p-0.5 cursor-pointer"
        >
          <Star className={`w-6 h-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  </div>
);

const Stars = ({ value }) => (
  <span className="inline-flex gap-0.5 align-middle">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
    ))}
  </span>
);

export const MyBookingsPage = () => {
  const { bookings, bookingsLoading, cancelBooking, fileComplaint, rateBooking, leaveMatch, showToast } = useApp();
  const [tab, setTab] = useState('upcoming');
  const [ratingId, setRatingId] = useState(null);
  const [pitchRating, setPitchRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [complainId, setComplainId] = useState(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Nút hủy phải tự ẩn và trận tự chuyển tab khi tới giờ dù người dùng không tải lại trang
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const handleLeave = async (booking) => {
    const late = booking.startsAt - Date.now() < 60 * 60 * 1000;
    const warn = late
      ? 'Trận bắt đầu trong chưa đầy 1 tiếng. Hủy bây giờ bạn sẽ bị trừ 5 điểm uy tín. Vẫn hủy tham gia?'
      : 'Hủy tham gia trận này? Đội trưởng sẽ được thông báo để tìm người thay.';
    if (!confirm(warn)) return;
    setCancellingId(booking.id);
    try {
      await leaveMatch(booking.id);
    } catch (err) {
      showToast(`Không hủy được: ${errorMessage(err)}`, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancel = async (booking) => {
    if (!confirm('Bạn có chắc chắn muốn hủy lịch đặt sân này? Tiền cọc hoàn theo chính sách của chủ sân.')) return;
    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id);
    } catch (err) {
      showToast(`Không hủy được: ${errorMessage(err)}`, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const groups = { upcoming: [], played: [], cancelled: [] };
  bookings.forEach((b) => groups[bookingGroup(b, now)].push(b));
  groups.upcoming.sort((a, b) => (a.startsAt ?? 0) - (b.startsAt ?? 0));
  groups.played.sort((a, b) => (b.startsAt ?? 0) - (a.startsAt ?? 0));
  const visible = groups[tab];

  const openRating = (booking) => {
    setRatingId(ratingId === booking.id ? null : booking.id);
    setPitchRating(0);
    setServiceRating(0);
    setRatingComment('');
  };

  const handleRate = async (e, booking) => {
    e.preventDefault();
    if (!pitchRating || !serviceRating) {
      showToast('Vui lòng chọn số sao cho mặt sân và dịch vụ.', 'error');
      return;
    }
    setSending(true);
    try {
      await rateBooking(booking.id, pitchRating, serviceRating, ratingComment.trim());
      setRatingId(null);
    } catch (err) {
      showToast(`Không gửi được đánh giá: ${errorMessage(err)}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const openComplaint = (booking) => {
    setComplainId(complainId === booking.id ? null : booking.id);
    setSubject('');
    setContent('');
  };

  const handleComplaint = async (e, booking) => {
    e.preventDefault();
    setSending(true);
    try {
      await fileComplaint(booking.id, subject.trim(), content.trim());
      setComplainId(null);
    } catch (err) {
      showToast(`Không gửi được khiếu nại: ${errorMessage(err)}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout
      backTo="/"
      icon={Calendar}
      eyebrow="Quản lý lịch thi đấu cá nhân / đội bóng"
      title="Lịch Đặt Sân Của Tôi"
      description="Thanh toán cọc, theo dõi trạng thái, hủy lịch, đánh giá sân hoặc gửi khiếu nại."
    >
      <div className="space-y-4">
        <MyMatchTasks />
        {bookingsLoading && bookings.length === 0 ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải lịch đặt...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Bạn chưa có lịch đặt sân nào.</p>
            <p className="text-xs text-slate-500 mt-1">Hãy tìm sân và đặt một trận đá bóng ngay hôm nay!</p>
            <Link
              to="/"
              className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Tìm sân ngay
            </Link>
          </div>
        ) : (
          <>
            <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    tab === t.key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {t.label} <span className="tabular-nums opacity-80">({groups[t.key].length})</span>
                </button>
              ))}
            </div>

            {visible.length === 0 && (
              <div className="text-center py-12 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-400">
                {TABS.find((t) => t.key === tab).empty}
              </div>
            )}

            {visible.map((booking) => {
              const ended = tab === 'played';
              const label = (ended && PLAYED.includes(booking.rawStatus)
                ? STATUS_LABEL.COMPLETED
                : STATUS_LABEL[booking.rawStatus]) || {
                text: booking.rawStatus,
                cls: 'bg-slate-800 text-slate-300',
              };
              const owned = !booking.isParticipant;
              const started = booking.startsAt !== undefined && booking.startsAt <= now;
              const cancellable =
                owned && !started && ['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(booking.rawStatus);
              const complainable = owned && CAN_COMPLAIN.includes(booking.rawStatus) && !booking.hasComplaint;
              const ratable = owned && ended && PLAYED.includes(booking.rawStatus) && !booking.review;
              const canRecruit = cancellable && !booking.sessionsTotal && !booking.hasOpenRecruit;
              const canLeave = booking.isParticipant && tab === 'upcoming' && !started;

              return (
                <div key={booking.id} className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-400">{booking.id}</span>
                        <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${label.cls}`}>
                          {label.text}
                        </span>
                        {booking.sessionsTotal && (
                          <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Định kỳ · {booking.sessionsTotal} buổi
                          </span>
                        )}
                        {booking.isParticipant && (
                          <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Tham gia · trận của {booking.teamName || booking.hostName || 'đội khác'}
                          </span>
                        )}
                        {booking.hasComplaint && (
                          <Link
                            to="/khieu-nai"
                            className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white"
                          >
                            Đã gửi khiếu nại · xem
                          </Link>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white">{booking.pitchName}</h3>
                      <div className="text-xs text-emerald-400 font-semibold">{booking.subPitchName}</div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            {booking.sessionsTotal ? 'Từ ' : ''}
                            {formatViDate(booking.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-white font-bold">
                            {booking.startTime} - {booking.endTime}
                          </span>
                        </div>
                      </div>

                      {owned && (
                        <div className="text-xs text-slate-400">
                          Tổng:{' '}
                          <span className="text-white font-medium tabular-nums">
                            {booking.totalPrice.toLocaleString('vi-VN')}đ
                          </span>
                          {booking.discountAmount > 0 && (
                            <span className="text-amber-300">
                              {' '}
                              (đã giảm {booking.discountAmount.toLocaleString('vi-VN')}đ)
                            </span>
                          )}{' '}
                          · Tiền cọc:{' '}
                          <span className="text-emerald-400 font-bold tabular-nums">
                            {booking.depositPaid.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      )}
                      {booking.services.length > 0 && (
                        <div className="text-[0.8125rem] text-slate-500">
                          Dịch vụ: {booking.services.map((x) => x.name).join(', ')}
                        </div>
                      )}
                      {booking.note && <div className="text-[0.8125rem] text-slate-500">{booking.note}</div>}
                      {booking.isParticipant && tab === 'upcoming' && (
                        <div className="space-y-1 text-xs">
                          {booking.venueAddress && (
                            <div className="flex items-start gap-1.5 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{booking.venueAddress}</span>
                            </div>
                          )}
                          {booking.hostPhone && (
                            <a
                              href={`tel:${booking.hostPhone}`}
                              className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Đội trưởng {booking.hostName}: {booking.hostPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {owned && booking.hasOpenRecruit && tab === 'upcoming' && (
                        <Link
                          to="/ghep-chan-le?tab=cua-toi"
                          className="inline-block text-xs text-emerald-300 font-semibold"
                        >
                          Đang tuyển chân lẻ · xem yêu cầu
                        </Link>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0 *:min-w-[7.5rem] *:whitespace-nowrap sm:*:min-w-0">
                      {owned && booking.rawStatus === 'HELD' && (
                        <button
                          onClick={() => setPayingId(payingId === booking.id ? null : booking.id)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Thanh toán cọc</span>
                        </button>
                      )}
                      {ratable && (
                        <button
                          onClick={() => openRating(booking)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Đánh giá sân</span>
                        </button>
                      )}
                      {owned && !ended && booking.rawStatus === 'CONFIRMED' && (
                        <button
                          onClick={() => setSelectedTicket(booking)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Mã check-in</span>
                        </button>
                      )}
                      {booking.conversationId && (
                        <Link
                          to={`/tin-nhan/${booking.conversationId}`}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-emerald-800 text-emerald-300 hover:bg-emerald-950/60 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </Link>
                      )}
                      {!booking.sessionsTotal && ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.rawStatus) && (
                        <Link
                          to={`/chia-tien/${booking.id}`}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-emerald-800 text-emerald-300 hover:bg-emerald-950/60 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          <span>{owned ? 'Chia tiền' : 'Sổ quỹ'}</span>
                        </Link>
                      )}
                      {canRecruit && (
                        <Link
                          to={`/ghep-chan-le/dang-tuyen?booking=${booking.id}`}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-emerald-800 text-emerald-300 hover:bg-emerald-950/60 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Tìm chân lẻ</span>
                        </Link>
                      )}
                      {canLeave && (
                        <button
                          onClick={() => handleLeave(booking)}
                          disabled={cancellingId === booking.id}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/60 disabled:opacity-60 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          {cancellingId === booking.id ? 'Đang hủy...' : 'Hủy tham gia'}
                        </button>
                      )}
                      {cancellable && (
                        <button
                          onClick={() => handleCancel(booking)}
                          disabled={cancellingId === booking.id}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/60 disabled:opacity-60 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          {cancellingId === booking.id ? 'Đang hủy...' : 'Hủy lịch đặt'}
                        </button>
                      )}
                      {complainable && (
                        <button
                          onClick={() => openComplaint(booking)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageSquareWarning className="w-3.5 h-3.5" />
                          <span>Khiếu nại</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {payingId === booking.id && (
                    <PaymentPanel bookingCode={booking.id} onReported={() => setPayingId(null)} />
                  )}

                  {booking.review && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                        <span>
                          Mặt sân <Stars value={booking.review.pitchRating} />
                        </span>
                        <span>
                          Dịch vụ <Stars value={booking.review.serviceRating} />
                        </span>
                      </div>
                      {booking.review.comment && <p className="text-slate-300">{booking.review.comment}</p>}
                      {booking.review.ownerReply && (
                        <p className="text-amber-300/90">Chủ sân phản hồi: {booking.review.ownerReply}</p>
                      )}
                    </div>
                  )}

                  {ratingId === booking.id && (
                    <form
                      onSubmit={(e) => handleRate(e, booking)}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs"
                    >
                      <StarInput label="Mặt sân" value={pitchRating} onChange={setPitchRating} />
                      <StarInput label="Dịch vụ" value={serviceRating} onChange={setServiceRating} />
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Chia sẻ cảm nhận về sân (không bắt buộc)"
                        rows={3}
                        maxLength={1000}
                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRatingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={sending}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold cursor-pointer"
                        >
                          {sending ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </div>
                    </form>
                  )}

                  {complainId === booking.id && (
                    <form
                      onSubmit={(e) => handleComplaint(e, booking)}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                    >
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Tiêu đề (ví dụ: Sân ngập nước, không đá được)"
                        maxLength={200}
                        required
                        className="w-full h-9 px-3 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none"
                      />
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Mô tả chi tiết sự việc"
                        rows={3}
                        maxLength={2000}
                        required
                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setComplainId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={sending}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold cursor-pointer"
                        >
                          {sending ? 'Đang gửi...' : 'Gửi khiếu nại'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {selectedTicket && (
        <Modal size="sm" onClose={() => setSelectedTicket(null)}>
          <div className="text-center space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Vé Điện Tử Check-In Sân Bóng
            </div>
            <h3 className="text-lg font-black text-white">{selectedTicket.pitchName}</h3>
            <p className="text-xs text-slate-300">{selectedTicket.subPitchName}</p>
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg">
              <QrCode className="w-40 h-40 text-slate-950" />
            </div>
            <div className="text-xs text-slate-400">Đọc mã đơn cho nhân viên tại sân để nhận sân.</div>
            <div className="pt-2 text-[0.8125rem] font-mono text-emerald-400">
              Mã: {selectedTicket.id} · {selectedTicket.startTime} - {selectedTicket.endTime}
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};
