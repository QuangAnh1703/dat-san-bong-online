import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

// PRD 2.2.6.2: cụm sân bị khóa / ngừng kinh doanh -> ví hội viên còn tiền bị đóng băng chờ admin hoàn trả
export const AdminWalletsPage = () => {
  const { showToast } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => apiClient.wallets.frozen().then(setData, (err) => showToast(errorMessage(err), 'error'));
  useEffect(() => {
    load();
  }, []);

  const refund = async (w) => {
    setBusy(w.id);
    try {
      await apiClient.wallets.adminRefund(w.id, `Hoàn trả số dư ví ${w.venue_name}`);
      showToast(`Đã ghi nhận hoàn ${vnd(w.balance)} cho ${w.user_name}`);
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageLayout
      tone="cyan"
      icon={Wallet}
      eyebrow="Quản trị hệ thống"
      title="Ví Hội Viên Đóng Băng"
      description="Tiền đọng trong ví của các cụm sân đã bị khóa. Chuyển trả cho người chơi rồi đánh dấu đã hoàn."
    >
      <AdminCard title={data ? `${data.count} ví · ${vnd(data.total)} cần hoàn` : 'Đang tải...'} icon={Wallet} iconCls="text-cyan-400">
        {data && data.count === 0 ? (
          <EmptyNote>Không có ví nào đang chờ hoàn tiền.</EmptyNote>
        ) : (
          <div className="divide-y divide-slate-800 text-xs">
            {(data?.data || []).map((w) => (
              <div key={w.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">
                    {w.user_name} · {w.phone}
                  </div>
                  <div className="text-slate-400">{w.venue_name}</div>
                </div>
                <span className="text-base font-black text-cyan-300 tabular-nums">{vnd(w.balance)}</span>
                <button
                  disabled={busy === w.id}
                  onClick={() => refund(w)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold cursor-pointer"
                >
                  Đã hoàn tiền
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </PageLayout>
  );
};
