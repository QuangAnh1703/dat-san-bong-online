import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Wallet } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card } from '../components/ui/PageLayout';
import { OwnerPage, OWNER_INPUT, OWNER_PRIMARY_BTN } from '../components/owner/OwnerPage';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const EMPTY = { name: '', price: '', bonus: '', discount_percent: '' };

// Gói trả trước của cụm sân (PRD 2.2.6): người chơi nạp tiền nhận thêm tiền tặng + giảm giá đặt sân
export const OwnerMembershipPage = () => {
  const { managedPitch, showToast } = useApp();
  const venueId = managedPitch?.id;
  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => apiClient.wallets.ownerPlans(venueId).then(setData, (err) => showToast(errorMessage(err), 'error'));
  useEffect(() => {
    if (!venueId) return;
    setData(null);
    load();
  }, [venueId]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await apiClient.wallets.createPlan(venueId, {
        name: form.name,
        price: Number(form.price),
        bonus: Number(form.bonus || 0),
        discount_percent: Number(form.discount_percent || 0),
      });
      setForm(EMPTY);
      showToast('Đã tạo gói thành viên');
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const toggle = async (p) => {
    try {
      await apiClient.wallets.updatePlan(p.id, { ...p, is_active: !p.is_active });
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  return (
    <OwnerPage
      icon={CreditCard}
      eyebrow="Thẻ hội viên & gói trả trước"
      description="Người chơi nạp tiền vào ví hội viên của cụm sân, nhận thêm tiền tặng và giảm giá tiền sân khi trả bằng ví."
    >
      <div className="space-y-4">
        {data && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400">Ví hội viên đang hoạt động</div>
              <div className="text-xl font-black text-white tabular-nums">{data.wallets}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400">Tổng số dư khách đang giữ</div>
              <div className="text-xl font-black text-amber-400 tabular-nums">{vnd(data.total_balance)}</div>
            </div>
          </div>
        )}

        <Card>
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-400" />
            Tạo gói mới
          </h2>
          <form onSubmit={create} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên gói (VD: Gold)" maxLength={60} className={`col-span-2 sm:col-span-1 ${OWNER_INPUT}`} />
            <input required type="number" min="10000" step="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Số tiền nạp" className={OWNER_INPUT} />
            <input type="number" min="0" step="1000" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} placeholder="Tiền tặng" className={OWNER_INPUT} />
            <input type="number" min="0" max="50" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="% giảm tiền sân" className={`col-span-2 sm:col-span-1 ${OWNER_INPUT}`} />
            <button type="submit" className={`col-span-2 sm:col-span-4 ${OWNER_PRIMARY_BTN}`}>
              Tạo gói
            </button>
          </form>
        </Card>

        {!data ? (
          <p className="text-xs text-slate-400">Đang tải...</p>
        ) : data.data.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            Chưa có gói thành viên nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.data.map((p) => (
              <div key={p.id} className={`p-4 rounded-2xl border bg-slate-900 ${p.is_active ? 'border-amber-800' : 'border-slate-800 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">{p.name}</h3>
                  {!p.is_active && <span className="text-[0.75rem] text-slate-400">Ngừng bán</span>}
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5">
                  <div>
                    Nạp <b className="text-white tabular-nums">{vnd(p.price)}</b>
                    {Number(p.bonus) > 0 && (
                      <>
                        {' '}
                        · tặng <b className="text-emerald-400 tabular-nums">{vnd(p.bonus)}</b>
                      </>
                    )}
                  </div>
                  {p.discount_percent > 0 && <div>Giảm thêm {p.discount_percent}% tiền sân khi trả bằng ví</div>}
                </div>
                <button onClick={() => toggle(p)} className="mt-3 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer">
                  {p.is_active ? 'Ngừng bán' : 'Mở bán lại'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerPage>
  );
};
