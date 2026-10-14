import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';

const Stat = ({ label, value, sub, cls = 'text-white' }) => (
  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
    <div className="text-xs text-slate-400">{label}</div>
    <div className={`text-xl sm:text-2xl font-black tabular-nums ${cls}`}>{value}</div>
    {sub && <div className="text-[0.8125rem] text-slate-500">{sub}</div>}
  </div>
);

export const AdminReportsPage = () => {
  const { adminReport } = useApp();

  return (
    <PageLayout
      tone="cyan"
      icon={BarChart2}
      eyebrow="Quản trị hệ thống"
      title="Báo Cáo Hệ Thống"
      description="Hoạt động đặt sân, tỷ lệ hủy, doanh thu và tỷ lệ lấp đầy toàn nền tảng."
    >
      {!adminReport ? (
        <AdminCard>
          <EmptyNote>Đang tải báo cáo...</EmptyNote>
        </AdminCard>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Đơn đặt trong tháng" value={adminReport.bookings} />
            <Stat
              label="Tỷ lệ hủy"
              value={`${adminReport.bookings ? Math.round((adminReport.cancelled / adminReport.bookings) * 100) : 0}%`}
              sub={`${adminReport.cancelled} đơn hủy / hết hạn`}
              cls="text-rose-400"
            />
            <Stat
              label="GMV đã xác nhận"
              value={`${adminReport.gmv.toLocaleString('vi-VN')}đ`}
              cls="text-emerald-400"
            />
            <Stat label="Kèo ghép thành công" value={adminReport.matchedPosts} cls="text-amber-400" />
          </div>

          <AdminCard title="Tỷ lệ lấp đầy theo khung giờ (30 ngày gần nhất)" icon={BarChart2}>
            <div className="space-y-2.5 text-xs">
              {adminReport.occupancy.map((o) => (
                <div key={o.label}>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>{o.label}</span>
                    <span className="font-bold text-emerald-400 tabular-nums">{o.rate}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, o.rate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[0.8125rem] text-slate-500">
              = số phút đã bán / (số sân con đang mở × 30 ngày × độ dài khung giờ).
            </p>
          </AdminCard>
        </div>
      )}
    </PageLayout>
  );
};
