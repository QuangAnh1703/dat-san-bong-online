import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, LogOut, ClipboardList, Check, X, Loader2, User, Wallet } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { mapOwnerBooking } from '../services/mappers';
import { Modal } from '../components/ui/Modal';
import { CheckoutModal } from '../components/owner/CheckoutModal';
import {
  OwnerPage,
  OWNER_INPUT,
  OWNER_PRIMARY_BTN,
  OWNER_SECONDARY_BTN,
  TODO_STATUSES,
  statusOf,
} from '../components/owner/OwnerPage';

const FILTERS = [
  { key: 'todo', label: 'Cần xử lý', match: (b) => TODO_STATUSES.includes(b.status) },
  { key: 'confirmed', label: 'Đã xác nhận', match: (b) => b.status === 'CONFIRMED' },
  { key: 'completed', label: 'Đã đá xong', match: (b) => b.status === 'COMPLETED' },
  { key: 'all', label: 'Tất cả', match: () => true },
];

export const OwnerBookingsPage = () => {
  const { managedPitch, reloadPitches, showToast } = useApp();
  const pitchId = managedPitch?.id;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('todo');
  const [busy, setBusy] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [checkoutCode, setCheckoutCode] = useState(null);

  const refresh = async () => {
    if (!pitchId) return;
    setLoading(true);
    try {
      const res = await apiClient.owner.getBookings(pitchId);
      setBookings((res.data || []).map(mapOwnerBooking));
    } catch (err) {
      showToast(`Không tải được đơn đặt: ${errorMessage(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Khách đặt/báo cọc trong lúc trang đang mở -> quay lại tab thì tải lại
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pitchId]);

  const run = async (code, action, success) => {
    setBusy(code);
    try {
      await action();
      showToast(success);
      await Promise.all([refresh(), reloadPitches()]);
      return true;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = (b) =>
    run(b.code, () => apiClient.owner.confirmBooking(b.code), `Đã xác nhận đơn ${b.code}`);

  const handleReject = async (e) => {
    e.preventDefault();
    const b = rejectTarget;
    const ok = await run(b.code, () => apiClient.owner.rejectBooking(b.code, reason.trim()), `Đã hủy đơn ${b.code}`);
    if (ok) setRejectTarget(null);
  };

  const active = FILTERS.find((f) => f.key === filter);
  const visible = bookings.filter(active.match);

  return (
    <OwnerPage
      icon={ClipboardList}
      eyebrow="Duyệt & quản lý đơn đặt sân"
      description="Chuyển khoản đúng nội dung được tự xác nhận; đơn còn lại kiểm tra tài khoản rồi xác nhận tay."
      actions={
        <Link to="/chu-san/doi-soat" className={`${OWNER_PRIMARY_BTN} inline-flex items-center gap-1.5`}>
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Đối soát chuyển khoản</span>
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto sm:inline-flex overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                filter === f.key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label} ({bookings.filter(f.match).length})
            </button>
          ))}
        </div>

        {loading && bookings.length === 0 ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải đơn đặt...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">
              {filter === 'todo' ? 'Không có đơn nào cần xử lý.' : 'Chưa có đơn đặt nào.'}
            </p>
          </div>
        ) : (
          visible.map((b) => {
            const st = statusOf(b.status);
            const actionable = ['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.status);
            const canCheckout = ['CONFIRMED', 'COMPLETED'].includes(b.status) && !b.checkedOut;
            return (
              <div
                key={b.code}
                className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400">{b.code}</span>
                    <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                    {b.kind === 'RECURRING' && (
                      <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        Định kỳ · {b.sessions} buổi
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{b.slotsLabel}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      <strong className="text-white">{b.customerName}</strong>
                      {b.customerPhone && (
                        <a href={`tel:${b.customerPhone}`} className="hover:text-amber-300">
                          {' '}
                          · {b.customerPhone}
                        </a>
                      )}
                      {b.teamName && ` · ${b.teamName}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      Tổng <span className="text-white font-medium tabular-nums">{b.totalAmount.toLocaleString('vi-VN')}đ</span>{' '}
                      · Cọc{' '}
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {b.depositAmount.toLocaleString('vi-VN')}đ
                      </span>
                      {b.amountReceived > 0 && b.amountReceived < b.depositAmount && (
                        <span className="text-amber-400 font-semibold">
                          {' '}
                          · Thanh toán thiếu: đã nhận {b.amountReceived.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </span>
                  </div>
                  {(b.services.length > 0 || b.note) && (
                    <div className="text-[0.8125rem] text-slate-500">
                      {b.services.length > 0 && `Dịch vụ: ${b.services.join(', ')}`}
                      {b.services.length > 0 && b.note && ' · '}
                      {b.note}
                    </div>
                  )}
                  <div className="text-[0.8125rem] text-slate-500">Đặt lúc {b.createdAt}</div>
                </div>

                {(actionable || canCheckout) && (
                  <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                    {b.status !== 'CONFIRMED' && (
                      <button
                        disabled={busy === b.code}
                        onClick={() => handleConfirm(b)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã nhận cọc</span>
                      </button>
                    )}
                    {canCheckout && (
                      <button
                        onClick={() => setCheckoutCode(b.code)}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-amber-700 text-amber-300 hover:bg-amber-950/60 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check-out</span>
                      </button>
                    )}
                    {actionable && (
                    <button
                      disabled={busy === b.code}
                      onClick={() => {
                        setRejectTarget(b);
                        setReason('');
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/60 disabled:opacity-60 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{b.status === 'CONFIRMED' ? 'Hủy đơn' : 'Từ chối'}</span>
                    </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {checkoutCode && <CheckoutModal code={checkoutCode} onClose={() => setCheckoutCode(null)} onDone={refresh} />}

      {rejectTarget && (
        <Modal
          tone="amber"
          icon={X}
          title={rejectTarget.status === 'CONFIRMED' ? 'Hủy Đơn Đặt Sân' : 'Từ Chối Đơn Đặt Sân'}
          description={`${rejectTarget.code} · ${rejectTarget.customerName}`}
          onClose={() => setRejectTarget(null)}
        >
          <form onSubmit={handleReject} className="space-y-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Lý do (gửi cho khách):</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Chưa nhận được tiền cọc"
                maxLength={300}
                required
                autoFocus
                className={OWNER_INPUT}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setRejectTarget(null)} className={`flex-1 ${OWNER_SECONDARY_BTN}`}>
                Quay lại
              </button>
              <button
                type="submit"
                disabled={busy === rejectTarget.code || !reason.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {busy === rejectTarget.code ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </OwnerPage>
  );
};
