import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  ClipboardList,
  CalendarDays,
  ChevronRight,
  Zap,
  Sliders,
  CreditCard,
  Trophy,
  ArrowRightLeft,
} from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { mapOwnerBooking, minutesToHHMM, toLocalISODate, todayISO } from '../services/mappers';
import { Card } from '../components/ui/PageLayout';
import { OccupancyBars, RevenueBars } from '../components/ReportCharts';
import { OwnerPage, TODO_STATUSES, statusOf } from '../components/owner/OwnerPage';

const Stat = ({ icon: Icon, iconCls, label, value, valueCls = 'text-white', hint }) => (
  <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-1 min-w-0">
    <div className="text-xs font-semibold text-slate-400 flex items-start gap-1.5">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
      <span>{label}</span>
    </div>
    <div className={`text-lg sm:text-2xl font-black font-display tabular-nums break-words ${valueCls}`}>{value}</div>
    <div className="text-[0.8125rem] text-slate-500">{hint}</div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, to, linkText }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <h2 className="text-base font-bold text-white flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-400" />
      <span>{title}</span>
    </h2>
    <Link to={to} className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
      <span>{linkText}</span>
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  </div>
);

const vnd = (n) => `${n.toLocaleString('vi-VN')}đ`;

const PERIODS = [
  { key: 'day', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
];

// Báo cáo chủ sân (PRD 2.4): chọn Ngày / Tuần / Tháng -> lượt đặt, doanh thu cọc, lấp đầy theo khung giờ
const OwnerReport = ({ pitchId }) => {
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pitchId) return;
    setReport(null);
    setError(null);
    apiClient.owner
      .getReport(pitchId, period)
      .then(setReport)
      .catch((err) => setError(errorMessage(err)));
  }, [pitchId, period]);

  const s = report?.summary;
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>Báo cáo kinh doanh</span>
        </h2>
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                period === p.key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="py-8 text-center text-xs text-rose-300">{error}</div>
      ) : !report ? (
        <div className="py-8 text-center text-xs text-slate-400">Đang tải báo cáo...</div>
      ) : report.empty ? (
        <div className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu doanh thu trong khoảng thời gian này.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              ['Lượt đặt', s.bookings, `${s.confirmed} đã xác nhận`],
              ['Doanh thu', vnd(s.gross), 'Đơn đã xác nhận'],
              ['Tiền cọc đã thu', vnd(s.deposit), 'Theo ngày thanh toán'],
              ['Doanh thu dịch vụ', vnd(s.service_revenue || 0), 'Căng-tin, thuê đồ, trọng tài'],
              ['Lấp đầy', `${s.occupancy_rate}%`, `${s.cancelled} đơn hủy`],
            ].map(([label, value, hint]) => (
              <div key={label} className="p-3 rounded-xl bg-slate-950 border border-slate-800 min-w-0">
                <div className="text-slate-400">{label}</div>
                <div className="text-lg font-black text-white tabular-nums break-words">{value}</div>
                <div className="text-[0.75rem] text-slate-500">{hint}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {report.series.length > 1 && (
              <div>
                <h3 className="text-xs font-bold text-slate-300 mb-2">Doanh thu theo ngày</h3>
                <RevenueBars series={report.series} granularity={report.granularity} tone="amber" />
              </div>
            )}
            <div className={report.series.length > 1 ? '' : 'lg:col-span-2'}>
              <h3 className="text-xs font-bold text-slate-300 mb-2">Tỷ lệ lấp đầy theo khung giờ</h3>
              <OccupancyBars bands={report.occupancy} tone="amber" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export const OwnerDashboard = () => {
  const { managedPitch, getVenueRevenue, showToast } = useApp();
  const pitchId = managedPitch?.id;

  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState(null);

  const refresh = () => {
    if (!pitchId) return;
    apiClient.owner
      .getBookings(pitchId)
      .then((res) => setBookings((res.data || []).map(mapOwnerBooking)))
      .catch((err) => showToast(`Không tải được đơn đặt: ${errorMessage(err)}`, 'error'));
    getVenueRevenue(pitchId)
      .then((rows) => {
        const today = todayISO();
        const day = (d) => toLocalISODate(new Date(d));
        const todayRow = rows.find((r) => day(r.date) === today);
        setRevenue({
          today: todayRow?.gross || 0,
          todayDeposit: todayRow?.deposit || 0,
          month: rows.filter((r) => day(r.date).startsWith(today.slice(0, 7))).reduce((s, r) => s + r.gross, 0),
        });
      })
      .catch(() => setRevenue(null));
  };

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pitchId]);

  const todo = bookings.filter((b) => TODO_STATUSES.includes(b.status));

  // Lịch hôm nay đã được tải cùng danh sách sân (AppContext) nên không cần gọi thêm
  const subPitches = managedPitch?.subPitches || [];
  const allSlots = subPitches.flatMap((s) => s.slots || []);
  const takenSlots = allSlots.filter((s) => s.status !== 'available').length;
  const occupancy = allSlots.length ? Math.round((takenSlots / allSlots.length) * 100) : 0;
  const peakRule = [...(managedPitch?.priceRules || [])].sort((a, b) => b.multiplier - a.multiplier)[0];

  return (
    <OwnerPage
      icon={LayoutDashboard}
      eyebrow="Tổng quan cụm sân"
      description={
        managedPitch &&
        `${managedPitch.address}, ${managedPitch.district} · ${subPitches.length} sân con${
          managedPitch.flashSale ? ` · Flash Sale -${managedPitch.flashSale.discountPercent}%` : ''
        }`
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat
            icon={DollarSign}
            iconCls="text-emerald-400"
            label="Doanh thu hôm nay"
            value={revenue ? vnd(revenue.today) : '—'}
            valueCls="text-emerald-400"
            hint={`Tiền cọc: ${revenue ? vnd(revenue.todayDeposit) : '—'}`}
          />
          <Stat
            icon={TrendingUp}
            iconCls="text-amber-400"
            label={`Doanh thu tháng ${todayISO().slice(5, 7)}`}
            value={revenue ? vnd(revenue.month) : '—'}
            hint="Tính trên các đơn đã xác nhận"
          />
          <Stat
            icon={BarChart3}
            iconCls="text-amber-400"
            label="Lấp đầy hôm nay"
            value={`${occupancy}%`}
            valueCls="text-amber-400"
            hint={`${takenSlots}/${allSlots.length} khung giờ còn lại đã có đội / khóa`}
          />
          <Stat
            icon={Clock}
            iconCls="text-amber-400"
            label="Khung giá cao nhất"
            value={peakRule ? `${minutesToHHMM(peakRule.fromMinute)}-${minutesToHHMM(peakRule.toMinute)}` : '—'}
            hint={peakRule ? `${peakRule.label || 'Hệ số'} · x${peakRule.multiplier}` : 'Chưa cấu hình bảng giá'}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['/chu-san/bang-gia', Sliders, 'Bảng giá & Flash Sale'],
            ['/chu-san/goi-thanh-vien', CreditCard, 'Gói thành viên'],
            ['/chu-san/giai-dau', Trophy, 'Giải đấu'],
            ['/chu-san/doi-soat', ArrowRightLeft, 'Đối soát chuyển khoản'],
          ].map(([to, Icon, label]) => (
            <Link
              key={to}
              to={to}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-700 text-xs font-semibold text-slate-200 flex items-center gap-2"
            >
              <Icon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <OwnerReport pitchId={pitchId} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <Card>
            <SectionHeader
              icon={ClipboardList}
              title={`Đơn cần xử lý (${todo.length})`}
              to="/chu-san/don-dat"
              linkText="Xem tất cả"
            />
            {todo.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Không có đơn nào cần xử lý.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {todo.slice(0, 5).map((b) => {
                  const st = statusOf(b.status);
                  return (
                    <Link
                      key={b.code}
                      to="/chu-san/don-dat"
                      className="py-3 flex items-center justify-between gap-3 text-xs group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{b.code}</span>
                          <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                        </div>
                        <div className="text-white font-semibold truncate">{b.slotsLabel}</div>
                        <div className="text-slate-400 truncate">
                          {b.customerName} · Cọc{' '}
                          <span className="text-emerald-400 font-bold tabular-nums">{vnd(b.depositAmount)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader icon={CalendarDays} title="Lịch hôm nay" to="/chu-san/lich" linkText="Quản lý lịch" />
            {subPitches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Cụm sân chưa có sân con nào.</div>
            ) : (
              <div className="space-y-3">
                {subPitches.map((sub) => {
                  const slots = sub.slots || [];
                  const taken = slots.filter((s) => s.status !== 'available').length;
                  const flash = slots.some((s) => s.isFlashSale);
                  return (
                    <div key={sub.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {sub.name}
                          {flash && <Zap className="w-3 h-3 text-amber-400" />}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {slots.length ? `${taken}/${slots.length} khung giờ` : 'Hết giờ trong ngày'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {slots.map((s) => (
                          <span
                            key={s.id}
                            title={`${s.startTime} - ${s.endTime}`}
                            className={`h-2 flex-1 rounded-full ${
                              s.status === 'available'
                                ? 'bg-slate-800'
                                : s.status === 'locked'
                                  ? 'bg-amber-500'
                                  : s.status === 'holding'
                                    ? 'bg-violet-500'
                                    : 'bg-emerald-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[0.8125rem] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đã đặt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" /> Giữ chỗ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Khóa / tại quầy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700" /> Trống
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </OwnerPage>
  );
};
