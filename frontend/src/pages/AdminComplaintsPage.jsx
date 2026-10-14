import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote, ReasonModal, useAdminRun } from '../components/admin/AdminShared';

const isOpen = (c) => !['RESOLVED', 'CLOSED'].includes(c.status);

export const AdminComplaintsPage = () => {
  const { complaints, resolveComplaint } = useApp();
  const { busyId, run } = useAdminRun();
  const [filter, setFilter] = useState('open');
  const [action, setAction] = useState(null); // { complaint, kind: 'REFUND' | 'REJECT' }

  const openCount = complaints.filter(isOpen).length;
  const list = complaints.filter((c) => (filter === 'open' ? isOpen(c) : filter === 'done' ? !isOpen(c) : true));

  const FILTERS = [
    { value: 'open', label: `Chờ xử lý (${openCount})` },
    { value: 'done', label: `Đã xử lý (${complaints.length - openCount})` },
    { value: 'all', label: 'Tất cả' },
  ];

  return (
    <PageLayout
      tone="cyan"
      icon={AlertTriangle}
      eyebrow="Quản trị hệ thống"
      title="Xử Lý Khiếu Nại & Hoàn Cọc"
      description="Xem nội dung khiếu nại, quyết định hoàn cọc hoặc từ chối kèm lý do."
    >
      <AdminCard title="Danh sách khiếu nại" icon={AlertTriangle} iconCls="text-rose-400">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                filter === f.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyNote>
            {filter === 'open' ? 'Không có khiếu nại nào đang chờ xử lý.' : 'Chưa có khiếu nại nào.'}
          </EmptyNote>
        ) : (
          <div className="divide-y divide-slate-800">
            {list.map((c) => {
              const open = isOpen(c);
              return (
                <div key={c.id} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      {c.code} · Đơn {c.bookingCode || '—'}
                    </div>
                    <span
                      className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${
                        open ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {open ? 'Chờ xử lý' : 'Đã xử lý'}
                    </span>
                  </div>
                  <div className="text-xs text-white font-bold">
                    {c.reporterName || 'Khách'} ({c.reporterPhone || '—'}) · {c.venueName || '—'}
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="font-semibold text-white mb-1">{c.subject}</div>
                    {c.content}
                  </div>
                  {c.resolution && <div className="text-[0.8125rem] text-slate-400">Kết quả: {c.resolution}</div>}
                  <div className="text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span>
                      Cọc đã thanh toán:{' '}
                      <strong className="text-emerald-400">{c.paidAmount.toLocaleString('vi-VN')}đ</strong>
                      <span className="text-slate-500"> · {c.createdAt}</span>
                    </span>

                    {open && (
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === c.id}
                          onClick={() => setAction({ complaint: c, kind: 'REFUND' })}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                        >
                          Hoàn 100% cọc
                        </button>
                        <button
                          disabled={busyId === c.id}
                          onClick={() => setAction({ complaint: c, kind: 'REJECT' })}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 font-semibold text-xs cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      {action && (
        <ReasonModal
          title={action.kind === 'REFUND' ? 'Hoàn 100% tiền cọc' : 'Từ chối khiếu nại'}
          description={`${action.complaint.code} · ${action.complaint.subject}`}
          label={action.kind === 'REFUND' ? 'Ghi chú kết quả xử lý:' : 'Lý do từ chối (gửi cho người khiếu nại):'}
          confirmText={action.kind === 'REFUND' ? 'Xác nhận hoàn cọc' : 'Từ chối khiếu nại'}
          danger={action.kind === 'REJECT'}
          onSubmit={(note) => run(action.complaint.id, () => resolveComplaint(action.complaint.id, action.kind, note))}
          onClose={() => setAction(null)}
        />
      )}
    </PageLayout>
  );
};
