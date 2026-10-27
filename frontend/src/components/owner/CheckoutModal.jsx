import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { errorMessage, useApp } from '../../context/AppContext';
import { apiClient } from '../../services/api';
import { Modal } from '../ui/Modal';
import { OWNER_INPUT, OWNER_PRIMARY_BTN, OWNER_SECONDARY_BTN } from './OwnerPage';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

// Check-out đơn: chốt tiền còn thu; đơn có đồ cho thuê bắt buộc kiểm đồ trước (PRD 2.2.5.2)
export const CheckoutModal = ({ code, onClose, onDone }) => {
  const { showToast } = useApp();
  const [data, setData] = useState(null);
  const [returned, setReturned] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.pos.checkoutSummary(code).then(setData, (err) => {
      showToast(errorMessage(err), 'error');
      onClose();
    });
  }, [code]);

  const hasRentals = data?.rentals.length > 0;
  const canSubmit = data && !data.checked_out_at && (!hasRentals || returned === true || (returned === false && note.trim()));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.pos.checkout(code, hasRentals ? { rentals_returned: returned, missing_note: note.trim() || undefined } : {});
      showToast(`Đã check-out đơn ${code}`);
      onDone?.();
      onClose();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal tone="amber" icon={LogOut} title="Hoàn Tất Đơn / Check-out" description={code} onClose={onClose}>
      {!data ? (
        <div className="py-6 flex justify-center text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {data.items.length > 0 && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800">
              {data.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-2 px-3 py-2">
                  <span className="text-slate-300">
                    {it.name} × {it.quantity}
                    {it.category === 'RENTAL' && <span className="ml-1.5 text-amber-400 font-semibold">(cho thuê)</span>}
                  </span>
                  <span className={`tabular-nums ${it.paid_with_booking ? 'text-slate-500' : 'text-white font-semibold'}`}>
                    {vnd(it.price * it.quantity)}
                    {it.paid_with_booking && ' · đã tính'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Tiền sân còn lại</span>
              <span className="tabular-nums">{vnd(data.field_remaining)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Dịch vụ cộng vào tiền sân</span>
              <span className="tabular-nums">{vnd(data.unpaid_services)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-1">
              <span>Cần thu</span>
              <span className="text-amber-400 tabular-nums">{vnd(data.amount_due)}</span>
            </div>
          </div>

          {hasRentals && !data.checked_out_at && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 space-y-2">
              <div className="flex items-start gap-2 text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>
                  Kiểm tra đồ cho thuê trước khi xác nhận:{' '}
                  {data.rentals.map((r) => `${r.name} × ${r.quantity}`).join(', ')}
                </span>
              </div>
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input type="radio" name="rentals" checked={returned === true} onChange={() => setReturned(true)} />
                Khách đã trả đủ đồ (cộng lại vào kho)
              </label>
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input type="radio" name="rentals" checked={returned === false} onChange={() => setReturned(false)} />
                Thiếu đồ
              </label>
              {returned === false && (
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: thiếu 1 áo bib, đã thu phí 50.000đ"
                  maxLength={300}
                  className={OWNER_INPUT}
                />
              )}
            </div>
          )}

          {data.checked_out_at ? (
            <p className="text-emerald-400 font-semibold">Đơn đã check-out lúc {new Date(data.checked_out_at).toLocaleString('vi-VN')}.</p>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={`flex-1 ${OWNER_SECONDARY_BTN}`}>
                Quay lại
              </button>
              <button type="submit" disabled={!canSubmit || busy} className={`flex-1 ${OWNER_PRIMARY_BTN}`}>
                {busy ? 'Đang xử lý...' : `Đã thu ${vnd(data.amount_due)}`}
              </button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};
