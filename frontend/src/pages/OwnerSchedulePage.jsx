import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Lock, Unlock, Zap, Plus, Trash2, PhoneCall, Loader2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { formatViDate, toLocalISODate } from '../services/mappers';
import { Modal } from '../components/ui/Modal';
import { OwnerPage, OWNER_INPUT, OWNER_PRIMARY_BTN, OWNER_SECONDARY_BTN } from '../components/owner/OwnerPage';

const SLOT_BADGE = {
  booked: { text: 'Đã có đội đặt', cls: 'bg-blue-950 text-blue-300 border border-blue-800' },
  holding: { text: 'Đang giữ chỗ', cls: 'bg-violet-950 text-violet-300 border border-violet-800' },
  locked: { text: 'Đang khóa', cls: 'bg-amber-950 text-amber-300 border border-amber-800' },
  available: { text: 'Đang trống', cls: 'bg-emerald-950 text-emerald-300 border border-emerald-800' },
};

const chip = (active) =>
  `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
    active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
  }`;

export const OwnerSchedulePage = () => {
  const { managedPitch, addSubPitch, deleteSubPitch, loadSubPitches, reloadPitches, showToast } = useApp();
  const pitchId = managedPitch?.id;

  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return toLocalISODate(d);
      }),
    [],
  );
  const [date, setDate] = useState(dates[0]);
  const [subPitches, setSubPitches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubId, setActiveSubId] = useState('');
  const [busy, setBusy] = useState(null);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubType, setNewSubType] = useState('7');

  const [lockTarget, setLockTarget] = useState(null);
  const [lockReason, setLockReason] = useState('MAINTENANCE');
  const [lockNote, setLockNote] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const refresh = async () => {
    if (!managedPitch) return;
    setLoading(true);
    try {
      setSubPitches(await loadSubPitches(managedPitch, date));
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // managedPitch đổi khi thêm/xóa sân con -> tải lại lịch
  }, [pitchId, date, managedPitch?.subPitches.length]);

  const currentSub = subPitches.find((s) => s.id === activeSubId) || subPitches[0];

  const afterChange = () => Promise.all([refresh(), reloadPitches()]);

  const openLock = (slot, mode) => {
    setLockTarget({ slot, mode });
    setLockReason('MAINTENANCE');
    setLockNote('');
    setGuestName('');
    setGuestPhone('');
  };

  const handleLockSubmit = async (e) => {
    e.preventDefault();
    if (!lockTarget || !currentSub) return;
    const walkin = lockTarget.mode === 'walkin';
    setSaving(true);
    try {
      await apiClient.owner.lockSlot({
        field_id: Number(currentSub.id),
        play_date: date,
        start: lockTarget.slot.startTime,
        end: lockTarget.slot.endTime,
        reason: walkin ? 'WALK_IN' : lockReason,
        guest_name: walkin ? guestName.trim() : lockNote.trim() || undefined,
        guest_phone: walkin && guestPhone.trim() ? guestPhone.replace(/\s/g, '') : undefined,
        note: lockNote.trim() || undefined,
      });
      showToast(walkin ? `Đã tạo đơn tại quầy cho ${guestName}` : 'Đã khóa khung giờ');
      setLockTarget(null);
      await afterChange();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async (slot) => {
    if (!slot.bookingCode) return;
    setBusy(slot.id);
    try {
      await apiClient.owner.unlockSlot(slot.bookingCode);
      showToast('Đã mở lại khung giờ');
      await afterChange();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleCreateSub = async (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setSaving(true);
    try {
      await addSubPitch(managedPitch.id, newSubName.trim(), newSubType);
      setAddOpen(false);
      setNewSubName('');
    } catch (err) {
      showToast(`Không tạo được sân con: ${errorMessage(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSub = async (sub) => {
    if (!confirm(`Bạn có chắc muốn xóa ${sub.name}?`)) return;
    try {
      await deleteSubPitch(sub.id);
    } catch (err) {
      showToast(`Không xóa được sân con: ${errorMessage(err)}`, 'error');
    }
  };

  return (
    <OwnerPage
      icon={CalendarDays}
      eyebrow="Lịch sân & khóa khung giờ"
      description="Khóa sân để bảo trì, tạo đơn cho khách gọi điện / tại quầy, hoặc mở lại khung giờ đã khóa."
      actions={
        <button
          onClick={() => setAddOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Thêm sân con</span>
        </button>
      }
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {dates.map((d, i) => (
              <button key={d} onClick={() => setDate(d)} className={chip(date === d)}>
                {i === 0 ? 'Hôm nay' : formatViDate(d).slice(0, 5)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {subPitches.map((sub) => (
              <div
                key={sub.id}
                className={`flex items-center rounded-xl border ${
                  currentSub?.id === sub.id ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900'
                }`}
              >
                <button
                  onClick={() => setActiveSubId(sub.id)}
                  className={`pl-3 pr-2 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
                    currentSub?.id === sub.id ? 'text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sub.name}
                </button>
                <button
                  onClick={() => handleDeleteSub(sub)}
                  className="pr-2.5 py-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                  title={`Xóa ${sub.name}`}
                  aria-label={`Xóa ${sub.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải lịch...</span>
          </div>
        ) : !currentSub ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            Cụm sân chưa có sân con nào.
          </div>
        ) : currentSub.slots.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            Không còn khung giờ nào trong ngày này (đã qua giờ hoặc chưa có bảng giá cho loại sân này).
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentSub.slots.map((slot) => {
              const badge = SLOT_BADGE[slot.status] || SLOT_BADGE.available;
              const ownerLock = slot.status === 'locked' && slot.bookingKind === 'OWNER_LOCK';
              return (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    slot.status === 'locked'
                      ? 'bg-amber-950/20 border-amber-900/70'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-extrabold text-white tabular-nums">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {ownerLock ? 'Đã khóa / tại quầy' : badge.text}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Đơn giá</span>
                        <span className="font-bold text-white tabular-nums">
                          {slot.originalPrice && (
                            <span className="text-slate-500 line-through font-normal mr-1">
                              {slot.originalPrice.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                          {slot.price.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      {slot.isFlashSale && (
                        <div className="text-amber-400 font-bold text-[0.8125rem] flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Đang áp dụng Flash Sale</span>
                        </div>
                      )}
                      {slot.bookedBy && (
                        <div className="text-slate-300 text-[0.8125rem]">
                          {slot.status === 'locked' ? 'Ghi chú' : 'Khách'}:{' '}
                          <strong className="text-white">{slot.bookedBy}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    {slot.status === 'available' ? (
                      <>
                        <button
                          onClick={() => openLock(slot, 'walkin')}
                          className="flex-1 py-2 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Khách tại quầy</span>
                        </button>
                        <button
                          onClick={() => openLock(slot, 'lock')}
                          className="flex-1 py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer border border-slate-700 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Khóa slot</span>
                        </button>
                      </>
                    ) : ownerLock ? (
                      <button
                        disabled={busy === slot.id}
                        onClick={() => handleUnlock(slot)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-amber-300 border border-amber-900/70 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Mở lại slot</span>
                      </button>
                    ) : (
                      <Link
                        to="/chu-san/don-dat"
                        className="w-full text-center text-[0.8125rem] text-slate-400 hover:text-amber-300 py-1"
                      >
                        Đơn {slot.bookingCode} · xử lý ở mục Đơn đặt sân
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && (
        <Modal tone="amber" icon={Plus} title="Thêm Sân Con Vào Cụm Sân" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleCreateSub} className="space-y-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Tên sân con:</label>
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Ví dụ: Sân 7 - C"
                maxLength={50}
                className={OWNER_INPUT}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Loại sân bóng:</label>
              <select value={newSubType} onChange={(e) => setNewSubType(e.target.value)} className={OWNER_INPUT}>
                <option value="5">Sân 5 người</option>
                <option value="7">Sân 7 người</option>
                <option value="11">Sân 11 người</option>
              </select>
            </div>
            <p className="text-[0.8125rem] text-slate-500">Giá thuê lấy theo bảng giá của cụm sân cho loại sân đã chọn.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddOpen(false)} className={`flex-1 ${OWNER_SECONDARY_BTN}`}>
                Hủy
              </button>
              <button type="submit" disabled={saving} className={`flex-1 ${OWNER_PRIMARY_BTN}`}>
                {saving ? 'Đang tạo...' : 'Tạo sân con'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {lockTarget && currentSub && (
        <Modal
          tone="amber"
          icon={lockTarget.mode === 'walkin' ? PhoneCall : Lock}
          title={lockTarget.mode === 'walkin' ? 'Tạo Đơn Khách Gọi Điện / Tại Quầy' : 'Khóa Khung Giờ'}
          description={
            <>
              {currentSub.name} · {formatViDate(date)} ({lockTarget.slot.startTime} - {lockTarget.slot.endTime})
              {lockTarget.mode === 'walkin' && ` · ${lockTarget.slot.price.toLocaleString('vi-VN')}đ`}
            </>
          }
          onClose={() => setLockTarget(null)}
        >
          <form onSubmit={handleLockSubmit} className="space-y-3">
            {lockTarget.mode === 'walkin' ? (
              <>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tên đội hoặc tên khách:</label>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className={OWNER_INPUT}
                    required
                    autoFocus
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    pattern="0[0-9 ]{9,12}"
                    placeholder="0912345678"
                    className={OWNER_INPUT}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Lý do khóa:</label>
                  <select value={lockReason} onChange={(e) => setLockReason(e.target.value)} className={OWNER_INPUT}>
                    <option value="MAINTENANCE">Bảo trì mặt cỏ / hệ thống đèn</option>
                    <option value="OTHER">Lý do khác (giải đấu, khách quen...)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Ghi chú:</label>
                  <input
                    value={lockNote}
                    onChange={(e) => setLockNote(e.target.value)}
                    className={OWNER_INPUT}
                    maxLength={120}
                    placeholder="Ví dụ: Thay cỏ khu vực khung thành"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setLockTarget(null)} className={`flex-1 ${OWNER_SECONDARY_BTN}`}>
                Hủy
              </button>
              <button type="submit" disabled={saving} className={`flex-1 ${OWNER_PRIMARY_BTN}`}>
                {saving ? 'Đang lưu...' : lockTarget.mode === 'walkin' ? 'Tạo đơn & khóa sân' : 'Xác nhận khóa slot'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </OwnerPage>
  );
};
