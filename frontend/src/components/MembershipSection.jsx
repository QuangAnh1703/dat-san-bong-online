import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Wallet } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Modal } from './ui/Modal';
import { MockTransferButton, TransferQR, toTransfer } from './TransferQR';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

// Gói hội viên của cụm sân + số dư ví của tôi (PRD 2.2.6)
export const MembershipSection = ({ venueId, venueName }) => {
  const { isLoggedIn, setIsAuthModalOpen, showToast } = useApp();
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [buying, setBuying] = useState(null);

  const loadWallet = () =>
    isLoggedIn ? apiClient.wallets.myAtVenue(venueId).then((r) => setWallet(r.wallet), () => undefined) : Promise.resolve();

  useEffect(() => {
    apiClient.wallets.plans(venueId).then((r) => setPlans(r.data || []), () => setPlans([]));
    loadWallet();
  }, [venueId, isLoggedIn]);

  if (plans.length === 0 && !wallet) return null;

  const buy = async (plan) => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      setBuying(await apiClient.wallets.topup(plan.id));
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          Gói thành viên {venueName}
        </h2>
        {wallet && (
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${wallet.status === 'FROZEN' ? 'border-rose-800 text-rose-300' : 'border-emerald-800 text-emerald-300'}`}>
            <Wallet className="w-3.5 h-3.5 inline mr-1" />
            Ví của bạn: <b className="tabular-nums">{vnd(wallet.balance)}</b>
            {wallet.plan_name && ` · ${wallet.plan_name}`}
            {wallet.discount_percent > 0 && ` · giảm ${wallet.discount_percent}%`}
            {wallet.status === 'FROZEN' && ' · đang đóng băng'}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((p) => (
          <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">{p.name}</div>
              <div className="text-xs text-slate-300 mt-1">
                Nạp {vnd(p.price)}
                {Number(p.bonus) > 0 && <span className="text-emerald-400 font-semibold"> · tặng {vnd(p.bonus)}</span>}
              </div>
              {p.discount_percent > 0 && <div className="text-xs text-amber-300">Giảm thêm {p.discount_percent}% tiền sân</div>}
            </div>
            <button
              onClick={() => buy(p)}
              disabled={wallet?.status === 'FROZEN'}
              className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
            >
              Mua gói
            </button>
          </div>
        ))}
      </div>
      <p className="text-[0.8125rem] text-slate-500">Khi đặt sân tại cụm sân này, bạn có thể trả cọc bằng ví hội viên.</p>
      {buying && (
        <TopupModal
          data={buying}
          onClose={() => setBuying(null)}
          onPaid={() => {
            loadWallet();
            showToast('Đã kích hoạt gói thành viên');
          }}
        />
      )}
    </section>
  );
};

const TopupModal = ({ data, onClose, onPaid }) => {
  const [status, setStatus] = useState(data.topup.status);
  const code = data.topup.code;

  const check = () =>
    apiClient.wallets.topupStatus(code).then((r) => {
      if (r.status === 'PAID' && status !== 'PAID') onPaid();
      setStatus(r.status);
    }, () => undefined);

  useEffect(() => {
    if (status === 'PAID') return undefined;
    const t = setInterval(() => document.visibilityState === 'visible' && check(), 5000);
    return () => clearInterval(t);
  }, [status]);

  return (
    <Modal icon={CreditCard} title={`Mua Gói ${data.plan.name}`} description={`Nhận ${vnd(data.plan.price + data.plan.bonus)} vào ví`} onClose={onClose}>
      {status === 'PAID' ? (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Đã nhận tiền, ví hội viên đã được cộng.
        </div>
      ) : (
        <div className="space-y-3">
          <TransferQR transfer={toTransfer(data.transfer)} />
          <p className="text-slate-400 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            Giữ nguyên nội dung chuyển khoản, ví được cộng tự động khi tiền về.
          </p>
          <MockTransferButton content={data.transfer.content} amount={data.transfer.amount} onDone={check} />
        </div>
      )}
    </Modal>
  );
};
