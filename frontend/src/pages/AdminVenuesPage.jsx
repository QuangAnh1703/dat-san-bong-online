import React, { useState } from 'react';
import { Building2, Clock, Check, X, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote, ReasonModal, useAdminRun } from '../components/admin/AdminShared';

export const AdminVenuesPage = () => {
  const { pendingVenues, approveVenue, rejectVenue, pitches } = useApp();
  const { busyId, run } = useAdminRun();
  const [rejecting, setRejecting] = useState(null);
  const [search, setSearch] = useState('');

  const s = search.trim().toLowerCase();
  const active = pitches.filter(
    (p) => !s || p.name.toLowerCase().includes(s) || `${p.address} ${p.district}`.toLowerCase().includes(s),
  );

  return (
    <PageLayout
      tone="cyan"
      icon={Building2}
      eyebrow="Quản trị hệ thống"
      title="Quản Lý Cụm Sân"
      description="Duyệt cụm sân chủ sân mới đăng ký và theo dõi các cụm sân đang hoạt động."
    >
      <div className="space-y-6">
        <AdminCard title={`Cụm sân chờ duyệt (${pendingVenues.length})`} icon={Clock} iconCls="text-amber-400">
          {pendingVenues.length === 0 ? (
            <EmptyNote>Không có cụm sân nào đang chờ duyệt.</EmptyNote>
          ) : (
            <div className="divide-y divide-slate-800">
              {pendingVenues.map((v) => (
                <div key={v.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-white text-sm">{v.name}</div>
                    <div className="text-xs text-slate-400">
                      {v.address}, {v.district} · {v.phone || '—'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Chủ sân: <span className="text-slate-200">{v.ownerName || '—'}</span>
                      {v.ownerContact && ` · ${v.ownerContact}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      Sân con: <span className="text-slate-200">{v.fields.join(', ') || 'chưa khai báo'}</span>
                    </div>
                    {v.amenities.length > 0 && (
                      <div className="text-xs text-slate-400">Tiện ích: {v.amenities.join(', ')}</div>
                    )}
                    <div className="text-xs text-slate-400">
                      Nhận cọc {v.depositPercent}%: <span className="text-slate-200">{v.bank || 'chưa khai báo'}</span>
                    </div>
                    <div className="text-[0.8125rem] text-slate-500 font-mono">Đăng ký lúc: {v.createdAt}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={busyId === v.id}
                      onClick={() => run(v.id, () => approveVenue(v.id))}
                      className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Duyệt sân</span>
                    </button>
                    <button
                      disabled={busyId === v.id}
                      onClick={() => setRejecting(v)}
                      className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-rose-400 border border-rose-900 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard
          title={`Cụm sân đang hoạt động (${active.length})`}
          icon={Building2}
          iconCls="text-emerald-400"
          actions={
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, địa chỉ, quận..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-none"
              />
            </div>
          }
        >
          {active.length === 0 ? (
            <EmptyNote>
              {pitches.length === 0 ? 'Chưa có cụm sân nào được duyệt.' : 'Không có cụm sân phù hợp.'}
            </EmptyNote>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {active.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-sm">{p.name}</h3>
                    <span className="text-xs text-amber-400 font-bold shrink-0">★ {p.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {p.address}, {p.district}
                  </div>
                  <div className="text-xs text-slate-500">
                    Quy mô: {p.subPitches.length} sân con
                    {p.maxPrice > 0 &&
                      ` · Khung giá: ${p.minPrice.toLocaleString('vi-VN')}đ - ${p.maxPrice.toLocaleString('vi-VN')}đ`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {rejecting && (
        <ReasonModal
          title="Từ chối cụm sân"
          description={rejecting.name}
          label="Lý do từ chối (gửi cho chủ sân):"
          confirmText="Từ chối cụm sân"
          danger
          onSubmit={(reason) => run(rejecting.id, () => rejectVenue(rejecting.id, reason))}
          onClose={() => setRejecting(null)}
        />
      )}
    </PageLayout>
  );
};
