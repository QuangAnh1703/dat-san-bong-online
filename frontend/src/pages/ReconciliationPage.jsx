import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, Landmark, Link2, Loader2, Undo2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { mapBankTransaction } from '../services/mappers';
import { PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';

const TABS = [
  { key: 'UNMATCHED', label: 'Cần đối soát' },
  { key: 'REFUND_PENDING', label: 'Chờ hoàn tiền' },
  { key: 'REFUNDED,IGNORED', label: 'Đã xử lý' },
];

const STATUS = {
  UNMATCHED: { text: 'Không khớp được', cls: 'bg-amber-950 text-amber-400 border border-amber-800' },
  REFUND_PENDING: { text: 'Chờ hoàn tiền', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  REFUNDED: { text: 'Đã hoàn tiền', cls: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
  IGNORED: { text: 'Đã ghi nhận', cls: 'bg-slate-800 text-slate-300' },
};

// Tailwind cần class tĩnh
const ACCENT = {
  amber: {
    tab: 'bg-amber-500 text-slate-950',
    primary: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    input: 'focus:border-amber-500',
    icon: 'text-amber-500',
  },
  cyan: {
    tab: 'bg-cyan-600 text-white',
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    input: 'focus:border-cyan-500',
    icon: 'text-cyan-400',
  },
};

// Hàng đợi chuyển khoản không tự khớp được (sai nội dung, đơn đã xác nhận) và tiền chờ hoàn (PRD 2.3.4)
export const ReconciliationPage = () => {
  const { role, showToast } = useApp();
  const tone = role === 'admin' ? 'cyan' : 'amber';
  const accent = ACCENT[tone];

  const [tab, setTab] = useState('UNMATCHED');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [bookingCode, setBookingCode] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await apiClient.payments.bankTransactions(tab);
      setItems((res.data || []).map(mapBankTransaction));
    } catch (err) {
      showToast(`Không tải được giao dịch: ${errorMessage(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [tab]);

  const run = async (id, action, success) => {
    setBusy(id);
    try {
      const r = await action();
      showToast(typeof success === 'function' ? success(r) : success);
      await refresh();
      return true;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const ASSIGN_RESULT = {
    confirmed: 'Đã gán giao dịch · đơn được xác nhận',
    underpaid: 'Đã gán giao dịch · đơn vẫn còn thiếu tiền cọc',
    refund_pending: 'Đơn không còn hiệu lực · giao dịch chuyển sang chờ hoàn tiền',
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    const t = assignTarget;
    const ok = await run(
      t.id,
      () => apiClient.payments.assignTransaction(t.id, bookingCode.trim()),
      (r) => ASSIGN_RESULT[r.result] || 'Đã gán giao dịch',
    );
    if (ok) setAssignTarget(null);
  };

  const resolve = (t, action) =>
    run(
      t.id,
      () => apiClient.payments.resolveTransaction(t.id, action),
      action === 'REFUNDED' ? 'Đã đánh dấu hoàn tiền' : 'Đã ghi nhận giao dịch',
    );

  return (
    <PageLayout
      tone={tone}
      icon={ArrowRightLeft}
      eyebrow={role === 'admin' ? 'Quản trị hệ thống' : 'Góc chủ sân'}
      title="Đối Soát Chuyển Khoản"
      description="Giao dịch ngân hàng không tự khớp được với đơn đặt (khách ghi sai nội dung, chuyển trùng) và các khoản cần hoàn lại."
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto sm:inline-flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                tab === t.key ? accent.tab : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải giao dịch...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800">
            <Landmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Không có giao dịch nào.</p>
            {tab === 'UNMATCHED' && (
              <p className="text-xs text-slate-400 mt-1">Chuyển khoản đúng nội dung được hệ thống tự xác nhận đơn.</p>
            )}
          </div>
        ) : (
          items.map((t) => {
            const st = STATUS[t.status] || { text: t.status, cls: 'bg-slate-800 text-slate-300' };
            return (
              <div
                key={t.id}
                className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-emerald-400 tabular-nums">
                      +{t.amount.toLocaleString('vi-VN')}đ
                    </span>
                    <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                    {t.isMock && (
                      <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
                        Giả lập
                      </span>
                    )}
                  </div>
                  <div className="text-white font-medium break-all">“{t.content || '(không có nội dung)'}”</div>
                  <div className="flex items-center gap-1.5">
                    <Landmark className={`w-3.5 h-3.5 shrink-0 ${accent.icon}`} />
                    <span>
                      {[t.bankName, t.accountNumber].filter(Boolean).join(' · ') || 'Không rõ tài khoản'} · {t.receivedAt}
                    </span>
                  </div>
                  {t.bookingCode && (
                    <div>
                      Đơn <span className={`font-mono font-bold ${accent.icon}`}>{t.bookingCode}</span>
                      {t.venueName && ` · ${t.venueName}`}
                      {t.customerName && ` · ${t.customerName}`}
                    </div>
                  )}
                  {t.note && <div className="text-slate-500">{t.note}</div>}
                </div>

                {['UNMATCHED', 'REFUND_PENDING'].includes(t.status) && (
                  <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                    {t.status === 'UNMATCHED' && (
                      <button
                        disabled={busy === t.id}
                        onClick={() => {
                          setAssignTarget(t);
                          setBookingCode('');
                        }}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl disabled:opacity-60 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${accent.primary}`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Gán vào đơn</span>
                      </button>
                    )}
                    <button
                      disabled={busy === t.id}
                      onClick={() => resolve(t, 'REFUNDED')}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/60 disabled:opacity-60 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Đã hoàn tiền</span>
                    </button>
                    {t.status === 'UNMATCHED' && (
                      <button
                        disabled={busy === t.id}
                        onClick={() => resolve(t, 'IGNORED')}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Ghi nhận</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {assignTarget && (
        <Modal
          tone={tone}
          icon={Link2}
          title="Gán Giao Dịch Vào Đơn"
          description={`+${assignTarget.amount.toLocaleString('vi-VN')}đ · “${assignTarget.content}”`}
          onClose={() => setAssignTarget(null)}
        >
          <form onSubmit={handleAssign} className="space-y-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Mã đơn đặt sân:</label>
              <input
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                placeholder="VD: BK261027ABCDE"
                maxLength={20}
                required
                autoFocus
                className={`w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono focus:outline-none ${accent.input}`}
              />
              <p className="text-slate-500 mt-1">Đủ tiền cọc thì đơn được xác nhận ngay.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={busy === assignTarget.id || !bookingCode.trim()}
                className={`flex-1 py-2.5 px-4 rounded-xl disabled:opacity-60 font-bold text-xs cursor-pointer ${accent.primary}`}
              >
                {busy === assignTarget.id ? 'Đang xử lý...' : 'Gán vào đơn'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageLayout>
  );
};
