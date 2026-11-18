import React, { useEffect, useMemo, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { DEAL_OPTIONS, formatViDate, SLOT_MINUTES, toLocalISODate } from '../services/mappers';
import { PaymentPanel } from '../components/PaymentPanel';
import { MembershipSection } from '../components/MembershipSection';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Clock, ShieldCheck, Zap, CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react';
import { Card, PageLayout } from '../components/ui/PageLayout';

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function upcomingDates(count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ddmm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : WEEKDAYS[d.getDay()];
    return { label: `${label} (${ddmm})`, val: toLocalISODate(d) };
  });
}

const PITCH_TYPE_LABEL = {
  5: 'Sân 5 người',
  7: 'Sân 7 người',
  11: 'Sân 11 người',
};

export const VenueDetailPage = () => {
  const { id } = useParams();
  const { search } = useLocation();
  const { pitches, pitchesLoading } = useApp();
  const pitch = pitches.find((p) => String(p.id) === id);

  if (!pitch) {
    return (
      <PageLayout backTo="/" title={pitchesLoading ? 'Đang tải thông tin sân...' : 'Không tìm thấy sân bóng'}>
        <Card className="py-16 text-center text-sm text-slate-400">
          {pitchesLoading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : (
            <>
              <p>Sân này không tồn tại hoặc đã ngừng nhận đặt.</p>
              <Link
                to="/"
                className="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Xem các sân khác
              </Link>
            </>
          )}
        </Card>
      </PageLayout>
    );
  }
  // key: đổi sân (hoặc mở link ca khác từ trợ lý) thì reset toàn bộ state đặt chỗ
  return <VenueDetail key={`${pitch.id}?${search}`} pitch={pitch} />;
};

const VenueDetail = ({ pitch }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, createBooking, loadSubPitches, setIsAuthModalOpen, reloadPitches } = useApp();

  // Link từ trợ lý đặt sân: /san/:id?ngay=YYYY-MM-DD&san=<fieldId>&gio=HH:MM -> chọn sẵn ca
  const [searchParams] = useSearchParams();
  const dates = useMemo(() => upcomingDates(7), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    const ngay = searchParams.get('ngay');
    return dates.some((d) => d.val === ngay) ? ngay : dates[0].val;
  });
  const [subPitches, setSubPitches] = useState(pitch.subPitches);
  const [selectedSubPitchId, setSelectedSubPitchId] = useState(() => {
    const san = searchParams.get('san');
    return pitch.subPitches.some((s) => s.id === san) ? san : pitch.subPitches[0]?.id || '';
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [pendingStart, setPendingStart] = useState(() => searchParams.get('gio'));
  const [loadedDate, setLoadedDate] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  // Booking Form State
  const [bookerName, setBookerName] = useState(user.name);
  const [teamName, setTeamName] = useState(user.team?.name || '');
  const [phone, setPhone] = useState(user.phone);
  // { serviceId: số lượng }
  const [selectedServices, setSelectedServices] = useState({});
  const [depositOption, setDepositOption] = useState('partial');
  const [lookingForRival, setLookingForRival] = useState(false);
  const [loserPercent, setLoserPercent] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    setBookerName(user.name);
    setPhone(user.phone);
    setTeamName(user.team?.name || '');
  }, [user.id, user.team?.id]);

  const refreshSchedule = async (date) => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      setSubPitches(await loadSubPitches(pitch, date));
      setLoadedDate(date);
    } catch (err) {
      setScheduleError(errorMessage(err));
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    setSelectedSlot(null);
    refreshSchedule(selectedDate);
  }, [selectedDate]);

  const selectedSubPitch = subPitches.find((s) => s.id === selectedSubPitchId) || subPitches[0];

  // Chọn ca từ link sau khi lịch ngày đó tải xong; ca đã bị đặt mất thì bỏ qua
  useEffect(() => {
    if (!pendingStart || loadedDate !== selectedDate || !selectedSubPitch?.slots) return;
    const slot = selectedSubPitch.slots.find((s) => s.startTime === pendingStart && s.status === 'available');
    if (slot) setSelectedSlot(slot);
    setPendingStart(null);
  }, [pendingStart, loadedDate, selectedDate, selectedSubPitch]);

  const slotPrice = selectedSlot ? selectedSlot.price : 0;
  const servicesTotal = pitch.services.reduce((sum, x) => sum + x.price * (selectedServices[x.id] || 0), 0);
  const servicesCount = Object.values(selectedServices).reduce((a, b) => a + b, 0);
  const totalPrice = slotPrice + servicesTotal;
  // Cùng công thức với backend: cọc = tổng × tỷ lệ cọc của sân, hoặc 100% nếu chọn trả hết
  // Tìm đối giao hữu: chỉ đặt cọc, phần còn lại chia theo kèo sau trận
  const rivalMode = lookingForRival && !!user.team;
  const depositAmount = depositOption === 'full' && !rivalMode ? totalPrice : Math.round(totalPrice * pitch.depositRate);

  const setServiceQty = (item, qty) =>
    setSelectedServices((prev) => {
      const max = item.stock ?? 99;
      const next = { ...prev };
      const q = Math.max(0, Math.min(qty, max, 99));
      if (q === 0) delete next[item.id];
      else next[item.id] = q;
      return next;
    });

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedSubPitch) return;
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!bookerName.trim() || !phone.trim()) {
      setBookingError('Vui lòng nhập tên người đặt và số điện thoại!');
      return;
    }

    setSubmitting(true);
    setBookingError(null);
    try {
      const booking = await createBooking({
        pitch,
        subPitch: selectedSubPitch,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        bookerName,
        phone,
        note: teamName.trim() ? `Đội: ${teamName.trim()}` : undefined,
        services: Object.entries(selectedServices).map(([id, quantity]) => ({ id: Number(id), quantity })),
        payFull: depositOption === 'full' && !rivalMode,
        lookingForRival: lookingForRival && !!user.team,
        loserPercent,
      });
      setBookingSuccess(booking);
      reloadPitches();
    } catch (err) {
      setBookingError(errorMessage(err));
      // Khung giờ có thể vừa bị người khác đặt -> tải lại lịch
      refreshSchedule(selectedDate);
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  };

  const holdUntil = bookingSuccess?.holdExpiresAt
    ? new Date(bookingSuccess.holdExpiresAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <PageLayout
      backTo="/"
      icon={MapPin}
      eyebrow={`${pitch.district} · Mở cửa: ${pitch.openingHours}`}
      title={pitch.name}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{pitch.address}</span>
          {pitch.phone && (
            <>
              <span className="text-slate-600">·</span>
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Hotline chủ sân: {pitch.phone}</span>
            </>
          )}
        </span>
      }
    >
      <Card className="space-y-6">
        {bookingSuccess ? (
          /* Success confirmation screen */
          <div className="py-8 text-center max-w-lg mx-auto space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white font-display">Đã Giữ Chỗ Thành Công!</h3>
              <p className="text-sm text-slate-300 mt-1">
                Mã đơn: <span className="font-mono font-bold text-emerald-400">{bookingSuccess.id}</span>
              </p>
              <p className="text-xs text-amber-300 mt-1">
                Khung giờ được giữ{holdUntil ? ` đến ${holdUntil}` : ''}. Thanh toán cọc qua SePay để
                đơn được xác nhận ngay.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between gap-3 py-1 border-b border-slate-800">
                <span className="text-slate-400">Cụm sân:</span>
                <span className="font-bold text-white text-right">{bookingSuccess.pitchName}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-slate-800">
                <span className="text-slate-400">Sân con:</span>
                <span className="font-bold text-emerald-400 text-right">{bookingSuccess.subPitchName}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-slate-800">
                <span className="text-slate-400">Thời gian:</span>
                <span className="font-bold text-white text-right">
                  {formatViDate(bookingSuccess.date)} ({bookingSuccess.startTime} - {bookingSuccess.endTime})
                </span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-slate-800">
                <span className="text-slate-400">Tổng tiền sân:</span>
                <span className="font-bold text-white tabular-nums">
                  {bookingSuccess.totalPrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {bookingSuccess.services.length > 0 && (
                <div className="flex justify-between gap-3 py-1 border-b border-slate-800">
                  <span className="text-slate-400">Dịch vụ:</span>
                  <span className="font-bold text-white text-right">
                    {bookingSuccess.services.map((x) => x.name).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3 py-1">
                <span className="text-slate-400">Tiền cọc cần chuyển:</span>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {bookingSuccess.depositPaid.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {bookingSuccess.lookingForRival && (
              <div className="text-xs text-amber-300 font-medium">
                Đã đăng tin tìm đối lên Sàn Cáp Kèo cho trận này!
              </div>
            )}

            <PaymentPanel bookingCode={bookingSuccess.id} />

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/lich-cua-toi')}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Xem lịch của tôi
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Date & Sub-pitch Selector Tabs */}
            <div className="flex flex-col gap-3 pb-4 border-b border-slate-800">
              {/* Date buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {dates.map((d) => (
                  <button
                    key={d.val}
                    onClick={() => setSelectedDate(d.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedDate === d.val
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Sub-pitch tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-medium shrink-0">Chọn sân con:</span>
                {subPitches.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubPitchId(sub.id);
                      setSelectedSlot(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedSubPitch?.id === sub.id
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>

            {!selectedSubPitch ? (
              <div className="text-center py-10 text-sm text-slate-400">
                Cụm sân này chưa có sân con nào đang hoạt động.
              </div>
            ) : (
              <>
                {/* Sub-pitch info */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{selectedSubPitch.name}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{PITCH_TYPE_LABEL[selectedSubPitch.type]}</span>
                  </div>
                  <div className="text-slate-400">
                    Mỗi trận {SLOT_MINUTES} phút · Cọc {Math.round(pitch.depositRate * 100)}%
                  </div>
                </div>

                {/* Real-time Schedule Grid (Slot Matrix) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Lịch trống ngày {formatViDate(selectedDate)}</span>
                    </h3>
                    <div className="flex items-center gap-3 text-[0.8125rem] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Trống
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        Giờ vàng
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                        Đã đặt
                      </span>
                    </div>
                  </div>

                  {scheduleError && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Không tải được lịch sân: {scheduleError}</span>
                    </div>
                  )}

                  {scheduleLoading ? (
                    <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải lịch sân...</span>
                    </div>
                  ) : selectedSubPitch.slots.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      Không còn khung giờ nào có thể đặt trong ngày này (đã qua giờ hoặc chủ sân chưa cấu hình bảng giá
                      cho loại sân này).
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {selectedSubPitch.slots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        const isAvailable = slot.status === 'available';

                        return (
                          <button
                            key={slot.id}
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setBookingError(null);
                            }}
                            className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              !isAvailable
                                ? 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                                : isSelected
                                  ? 'bg-emerald-950 border-emerald-400 ring-2 ring-emerald-500 text-white shadow-lg shadow-emerald-950'
                                  : slot.isFlashSale
                                    ? 'bg-slate-900 border-amber-500/60 hover:border-amber-400 text-white'
                                    : slot.isPeak
                                      ? 'bg-slate-900 border-amber-600/40 hover:border-emerald-500 text-white'
                                      : 'bg-slate-900 border-slate-700/80 hover:border-emerald-500 text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-bold">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              {slot.isFlashSale && isAvailable ? (
                                <span className="text-[0.6875rem] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                                  -{pitch.flashSale?.discountPercent}%
                                </span>
                              ) : (
                                slot.isPeak &&
                                isAvailable && (
                                  <span className="text-[0.6875rem] font-bold px-1 py-0.2 rounded bg-amber-900/60 text-amber-300">
                                    Giờ vàng
                                  </span>
                                )
                              )}
                            </div>

                            <div>
                              {slot.status === 'booked' ? (
                                <div className="text-[0.8125rem] text-slate-500 truncate">
                                  Đã đặt{slot.bookedBy ? `: ${slot.bookedBy}` : ''}
                                </div>
                              ) : slot.status === 'holding' ? (
                                <div className="text-[0.8125rem] text-slate-500 truncate">Đang có người giữ chỗ</div>
                              ) : slot.status === 'locked' ? (
                                <div className="text-[0.8125rem] text-amber-500 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span className="truncate">{slot.lockReason || 'Bảo trì'}</span>
                                </div>
                              ) : (
                                <div>
                                  {slot.originalPrice && (
                                    <div className="text-[0.75rem] text-slate-500 line-through tabular-nums">
                                      {slot.originalPrice.toLocaleString('vi-VN')}đ
                                    </div>
                                  )}
                                  <div className="text-xs font-black text-emerald-400 tabular-nums">
                                    {slot.price.toLocaleString('vi-VN')}đ
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Quick Booking Drawer */}
            {selectedSlot && selectedSubPitch && (
              <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-slate-950 border border-emerald-800/80 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
                <div className="pb-4 border-b border-slate-800">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                    <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                    <span>Đặt sân nhanh trong 60 giây</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {selectedSubPitch.name} · {formatViDate(selectedDate)} ({selectedSlot.startTime} -{' '}
                    {selectedSlot.endTime})
                  </h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                  {/* Left: Booker info & Add-ons */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Tên người đặt</label>
                        <input
                          type="text"
                          value={bookerName}
                          onChange={(e) => setBookerName(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Số điện thoại liên hệ</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Tên đội bóng (ghi chú cho chủ sân, không bắt buộc)
                      </label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Tìm đối: tự đăng tin lên sàn cáp kèo, cần có đội bóng */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                      <label
                        className={`flex items-start gap-2.5 ${user.team ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                      >
                        <input
                          type="checkbox"
                          checked={lookingForRival}
                          disabled={!user.team}
                          onChange={(e) => setLookingForRival(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            ⚽ Bật chế độ "Tìm đối giao hữu" (Cáp kèo phủi)
                          </span>
                          <span className="text-[0.8125rem] text-slate-300 block mt-0.5">
                            {user.team ? (
                              <>
                                Tự động đăng trận này lên Sàn Cáp Kèo dưới tên đội <strong>{user.team.name}</strong>.
                              </>
                            ) : (
                              <>
                                Cần tạo đội bóng trước.{' '}
                                <button
                                  type="button"
                                  onClick={() => navigate('/ho-so')}
                                  className="underline text-emerald-300 cursor-pointer"
                                >
                                  Tạo đội trong hồ sơ
                                </button>
                              </>
                            )}
                          </span>
                        </div>
                      </label>
                      {lookingForRival && (
                        <select
                          value={loserPercent}
                          onChange={(e) => setLoserPercent(Number(e.target.value))}
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none"
                        >
                          {DEAL_OPTIONS.map((d) => (
                            <option key={d.percent} value={d.percent}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Dịch vụ cộng thêm của sân */}
                    {pitch.services.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-2">
                          Dịch vụ cộng thêm sân bóng:
                        </label>
                        <div className="space-y-2">
                          {pitch.services.map((item) => {
                            const qty = selectedServices[item.id] || 0;
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border text-xs ${
                                  qty > 0 ? 'border-emerald-700' : 'border-slate-800'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-slate-300 truncate">{item.name}</div>
                                  <div className="text-[0.75rem] text-slate-500 tabular-nums">
                                    {item.price.toLocaleString('vi-VN')}đ
                                    {item.stock != null && item.stock <= 10 && ` · còn ${item.stock}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    aria-label={`Bớt ${item.name}`}
                                    disabled={qty === 0}
                                    onClick={() => setServiceQty(item, qty - 1)}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <span className="w-5 text-center font-bold text-white tabular-nums">{qty}</span>
                                  <button
                                    type="button"
                                    aria-label={`Thêm ${item.name}`}
                                    disabled={item.stock != null && qty >= item.stock}
                                    onClick={() => setServiceQty(item, qty + 1)}
                                    className="w-7 h-7 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Price Breakdown */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Chi tiết thanh toán & Giữ sân
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>
                            Tiền sân ({selectedSlot.startTime} - {selectedSlot.endTime}):
                          </span>
                          <span className="font-bold text-white tabular-nums">
                            {slotPrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        {selectedSlot.originalPrice && (
                          <div className="flex justify-between text-amber-300">
                            <span>Flash Sale đã giảm:</span>
                            <span className="font-bold tabular-nums">
                              -{(selectedSlot.originalPrice - slotPrice).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        )}
                        {servicesTotal > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span>Dịch vụ cộng thêm ({servicesCount} món):</span>
                            <span className="font-bold text-white tabular-nums">
                              +{servicesTotal.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-extrabold text-white">
                          <span>Tổng chi phí trận đấu:</span>
                          <span className="text-emerald-400 tabular-nums">{totalPrice.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <div className="text-xs font-semibold text-slate-300">Hình thức cọc:</div>
                        <div className={`grid gap-2 text-xs ${rivalMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {(rivalMode ? ['partial'] : ['partial', 'full']).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setDepositOption(opt)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                (rivalMode ? 'partial' : depositOption) === opt
                                  ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div>
                                {opt === 'partial'
                                  ? `Cọc giữ chỗ ${Math.round(pitch.depositRate * 100)}%`
                                  : 'Thanh toán 100%'}
                              </div>
                              <div className="text-emerald-400 font-extrabold mt-0.5 tabular-nums">
                                {(opt === 'partial'
                                  ? Math.round(totalPrice * pitch.depositRate)
                                  : totalPrice
                                ).toLocaleString('vi-VN')}
                                đ
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[0.8125rem] text-slate-400 space-y-1">
                        <div>• Sau khi xác nhận, hệ thống giữ khung giờ này cho bạn trong 15 phút.</div>
                        <div>• Thanh toán cọc qua SePay ở bước tiếp theo, đơn được xác nhận ngay.</div>
                      </div>

                      {bookingError && (
                        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                          <span>{bookingError}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      disabled={submitting}
                      className="mt-4 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950 active:scale-98"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {!isLoggedIn ? 'Đăng nhập để đặt sân' : submitting ? 'Đang giữ chỗ...' : 'Xác nhận & Giữ chỗ'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <div className="mt-6">
        <MembershipSection venueId={pitch.id} venueName={pitch.name} />
      </div>
    </PageLayout>
  );
};
