import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Building2,
  AlertTriangle,
  FileText,
  CalendarCheck,
  BarChart2,
  Clock,
  ChevronRight,
  ArrowRightLeft,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard } from '../components/admin/AdminShared';

const Metric = ({ icon: Icon, iconCls, label, value, valueCls = 'text-white', sub }) => (
  <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-1">
    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
      <Icon className={`w-4 h-4 ${iconCls}`} />
      <span>{label}</span>
    </div>
    <div className={`text-2xl font-black font-display tabular-nums ${valueCls}`}>{value}</div>
    {sub && <div className="text-[0.8125rem] text-slate-400">{sub}</div>}
  </div>
);

const TodoLink = ({ to, icon: Icon, title, hint, count, danger }) => (
  <Link
    to={to}
    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-700 transition-colors group"
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        count > 0
          ? danger
            ? 'bg-rose-950 text-rose-300'
            : 'bg-amber-950 text-amber-300'
          : 'bg-slate-800 text-slate-400'
      }`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="text-xs text-slate-400">{count > 0 ? hint : 'Không có việc tồn đọng'}</div>
    </div>
    <span
      className={`px-2 min-w-7 text-center rounded-full text-xs font-bold tabular-nums ${
        count > 0 ? (danger ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950') : 'bg-slate-800 text-slate-400'
      }`}
    >
      {count}
    </span>
    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
  </Link>
);

export const AdminDashboard = () => {
  const { adminStats, ownerApplications, pendingVenues, complaints, adminReport } = useApp();
  const openComplaints = complaints.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const pendingTotal = ownerApplications.length + pendingVenues.length;
  const [bankQueue, setBankQueue] = useState(0);
  const [frozenWallets, setFrozenWallets] = useState(0);

  useEffect(() => {
    apiClient.payments.bankTransactions().then(
      (res) => setBankQueue(res.count || 0),
      () => undefined,
    );
    apiClient.wallets.frozen().then(
      (res) => setFrozenWallets(res.count || 0),
      () => undefined,
    );
  }, []);

  return (
    <PageLayout
      tone="cyan"
      icon={Shield}
      eyebrow="Hệ thống quản trị trung tâm"
      title="Tổng Quan Nền Tảng"
      description="Số liệu toàn hệ thống và các việc đang chờ quản trị viên xử lý."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            icon={Building2}
            iconCls="text-cyan-400"
            label="Cụm sân đối tác"
            value={adminStats?.approvedVenues ?? '—'}
            sub={`Tổng ${adminStats?.totalVenues ?? '—'} cụm đã đăng ký`}
          />
          <Metric
            icon={Users}
            iconCls="text-emerald-400"
            label="Tài khoản người dùng"
            value={adminStats?.totalUsers.toLocaleString('vi-VN') ?? '—'}
            valueCls="text-emerald-400"
          />
          <Metric
            icon={CalendarCheck}
            iconCls="text-amber-400"
            label="Tổng đơn đặt sân"
            value={adminStats?.totalBookings.toLocaleString('vi-VN') ?? '—'}
            valueCls="text-amber-400"
          />
          <Metric
            icon={Clock}
            iconCls="text-rose-400"
            label="Đang chờ duyệt"
            value={pendingTotal}
            valueCls="text-rose-400"
            sub={`${ownerApplications.length} chủ sân · ${pendingVenues.length} cụm sân`}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <AdminCard title="Việc cần xử lý" icon={Clock} iconCls="text-amber-400">
            <div className="space-y-3">
              <TodoLink
                to="/quan-tri/chu-san"
                icon={FileText}
                title="Duyệt yêu cầu chủ sân"
                hint="Người chơi xin nâng cấp lên chủ sân"
                count={ownerApplications.length}
              />
              <TodoLink
                to="/quan-tri/cum-san"
                icon={Building2}
                title="Duyệt cụm sân mới"
                hint="Cụm sân chờ kiểm tra trước khi mở đặt"
                count={pendingVenues.length}
              />
              <TodoLink
                to="/quan-tri/khieu-nai"
                icon={AlertTriangle}
                title="Khiếu nại chờ xử lý"
                hint="Cần quyết định hoàn cọc hoặc từ chối"
                count={openComplaints}
                danger
              />
              <TodoLink
                to="/quan-tri/doi-soat"
                icon={ArrowRightLeft}
                title="Đối soát chuyển khoản"
                hint="Giao dịch không tự khớp được / chờ hoàn tiền"
                count={bankQueue}
              />
              <TodoLink
                to="/quan-tri/vi-hoi-vien"
                icon={Wallet}
                title="Hoàn tiền ví hội viên"
                hint="Ví của cụm sân bị khóa còn số dư"
                count={frozenWallets}
                danger
              />
            </div>
          </AdminCard>

          <div className="xl:col-span-2">
            <AdminCard
              title="Tháng này"
              icon={BarChart2}
              actions={
                <Link to="/quan-tri/bao-cao" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
                  Xem báo cáo đầy đủ →
                </Link>
              }
            >
              {!adminReport ? (
                <div className="py-6 text-center text-xs text-slate-400">Đang tải báo cáo...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Đơn đặt</div>
                    <div className="text-xl font-black text-white tabular-nums">{adminReport.bookings}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Tỷ lệ hủy</div>
                    <div className="text-xl font-black text-rose-400 tabular-nums">
                      {adminReport.bookings ? Math.round((adminReport.cancelled / adminReport.bookings) * 100) : 0}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">GMV đã xác nhận</div>
                    <div className="text-xl font-black text-emerald-400 tabular-nums">
                      {adminReport.gmv.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Kèo ghép thành công</div>
                    <div className="text-xl font-black text-amber-400 tabular-nums">{adminReport.matchedPosts}</div>
                  </div>
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
