import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';
import { TICKET_STATUS } from './ComplaintsPage';

const isOpen = (c) => !['RESOLVED', 'CLOSED'].includes(c.status);

export const AdminComplaintsPage = () => {
  const { complaints } = useApp();
  const [filter, setFilter] = useState('open');

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
      description="Xem hồ sơ (đơn, giao dịch cọc, nhật ký chat), yêu cầu bổ sung thông tin và ra phán quyết."
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
              const st = TICKET_STATUS[c.status] || TICKET_STATUS.NEW;
              return (
                <div key={c.id} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      {c.code} · Đơn {c.bookingCode || '—'}
                    </div>
                    <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                  </div>
                  <div className="text-xs text-white font-bold">
                    {c.reporterName || 'Khách'} ({c.reporterPhone || '—'}) · {c.venueName || '—'}
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="font-semibold text-white mb-1">{c.subject}</div>
                    <div className="line-clamp-3">{c.content}</div>
                  </div>
                  {c.status === 'NEED_INFO' && (
                    <div className={`text-xs flex items-center gap-1 ${c.infoOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{c.infoOverdue ? 'Quá hạn bổ sung 24h' : `Hạn bổ sung: ${c.infoDueAt}`}</span>
                    </div>
                  )}
                  {c.resolution && <div className="text-[0.8125rem] text-slate-400">Kết quả: {c.resolution}</div>}
                  <div className="text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span>
                      Cọc đã thanh toán:{' '}
                      <strong className="text-emerald-400">{c.paidAmount.toLocaleString('vi-VN')}đ</strong>
                      <span className="text-slate-500"> · {c.createdAt}</span>
                    </span>

                    <Link
                      to={`/quan-tri/khieu-nai/${c.id}`}
                      className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      <span>{isOpen(c) ? 'Xem hồ sơ & xử lý' : 'Xem hồ sơ'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

    </PageLayout>
  );
};
