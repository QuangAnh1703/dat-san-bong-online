import React, { useEffect, useState } from 'react';
import { BarChart2, Download, Loader2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { toLocalISODate } from '../services/mappers';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';
import { OccupancyBars, RevenueBars } from '../components/ReportCharts';

const Stat = ({ label, value, sub, cls = 'text-white' }) => (
  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 min-w-0">
    <div className="text-xs text-slate-400">{label}</div>
    <div className={`text-xl sm:text-2xl font-black tabular-nums break-words ${cls}`}>{value}</div>
    {sub && <div className="text-[0.8125rem] text-slate-500">{sub}</div>}
  </div>
);

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalISODate(d);
};
const today = () => toLocalISODate(new Date());
const PRESETS = [
  { key: 'month', label: 'Tháng này', range: () => ({ from: today().slice(0, 8) + '01', to: today() }) },
  { key: '7d', label: '7 ngày', range: () => ({ from: daysAgo(6), to: today() }) },
  { key: '30d', label: '30 ngày', range: () => ({ from: daysAgo(29), to: today() }) },
  { key: 'year', label: 'Năm nay', range: () => ({ from: today().slice(0, 4) + '-01-01', to: today() }) },
];
const DAY_MS = 86400000;

export const AdminReportsPage = () => {
  const { showToast } = useApp();
  const [range, setRange] = useState(PRESETS[0].range());
  const [preset, setPreset] = useState('month');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const days = Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY_MS) + 1;
  // Quá 1 năm: không xem trực tiếp, chỉ xuất file chạy nền gửi qua email (PRD 3.3)
  const tooLong = days > 366;

  useEffect(() => {
    if (!range.from || !range.to || days < 1 || tooLong) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiClient.admin
      .getReports(range)
      .then(setReport)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const pickPreset = (p) => {
    setPreset(p.key);
    setRange(p.range());
  };

  const setDate = (key) => (e) => {
    setPreset('custom');
    setRange((r) => ({ ...r, [key]: e.target.value }));
  };

  const exportFile = async () => {
    setExporting(true);
    try {
      const res = await apiClient.admin.exportReport(range);
      if (res.queued) {
        showToast(`Khoảng dữ liệu lớn: báo cáo đang được tạo và sẽ gửi tới ${res.email}.`);
        return;
      }
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-sanbong-${range.from}_${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;

  return (
    <PageLayout
      tone="cyan"
      icon={BarChart2}
      eyebrow="Quản trị hệ thống"
      title="Báo Cáo Hệ Thống"
      description="Lượt đặt, doanh thu và tỷ lệ lấp đầy toàn sàn theo khoảng thời gian."
    >
      <div className="space-y-6">
        <AdminCard>
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 text-xs">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => pickPreset(p)}
                  aria-pressed={preset === p.key}
                  className={`px-3 py-2 rounded-lg font-semibold cursor-pointer ${
                    preset === p.key ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:ml-auto">
              <label className="block">
                <span className="text-slate-400">Từ ngày</span>
                <input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={setDate('from')}
                  className="w-full h-10 px-2 rounded-lg border border-slate-700 bg-slate-950 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-400">Đến ngày</span>
                <input
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={setDate('to')}
                  className="w-full h-10 px-2 rounded-lg border border-slate-700 bg-slate-950 text-white"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={exportFile}
              disabled={exporting || days < 1}
              className="h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{tooLong ? 'Xuất file (gửi email)' : 'Xuất file Excel (CSV)'}</span>
            </button>
          </div>
        </AdminCard>

        {tooLong ? (
          <AdminCard>
            <EmptyNote>
              Khoảng {days} ngày quá dài để xem trực tiếp. Bấm “Xuất file”, hệ thống xử lý nền và gửi báo cáo qua email.
            </EmptyNote>
          </AdminCard>
        ) : error ? (
          <AdminCard>
            <EmptyNote>{error}</EmptyNote>
          </AdminCard>
        ) : !report || loading ? (
          <AdminCard>
            <EmptyNote>Đang tải báo cáo...</EmptyNote>
          </AdminCard>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Tổng lượt đặt" value={s.bookings} sub={`${s.confirmed} đơn đã xác nhận`} />
              <Stat
                label="Tỷ lệ hủy"
                value={`${s.bookings ? Math.round((s.cancelled / s.bookings) * 100) : 0}%`}
                sub={`${s.cancelled} đơn hủy / hết hạn / hoàn cọc`}
                cls="text-rose-400"
              />
              <Stat label="Tổng doanh thu" value={vnd(s.gross)} sub={`Tiền cọc đã thu ${vnd(s.deposit)}`} cls="text-emerald-400" />
              <Stat
                label="Lấp đầy trung bình"
                value={`${s.occupancy_rate}%`}
                sub={`${s.matched_posts} kèo ghép thành công · ${report.open_complaints} khiếu nại mở`}
                cls="text-amber-400"
              />
            </div>

            {report.empty ? (
              <AdminCard>
                <EmptyNote>Chưa có dữ liệu doanh thu trong khoảng thời gian này.</EmptyNote>
              </AdminCard>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <div className="lg:col-span-2">
                  <AdminCard title={`Doanh thu theo ${report.granularity === 'month' ? 'tháng' : 'ngày'}`} icon={BarChart2}>
                    <RevenueBars series={report.series} granularity={report.granularity} tone="cyan" />
                  </AdminCard>
                </div>
                <AdminCard title="Lấp đầy theo khung giờ">
                  <OccupancyBars bands={report.occupancy} tone="cyan" />
                  <p className="text-[0.8125rem] text-slate-500">
                    = phút đã bán / (sân con đang mở × {report.days} ngày × độ dài khung giờ)
                  </p>
                </AdminCard>
                <div className="lg:col-span-3">
                  <AdminCard title="Cụm sân doanh thu cao nhất">
                    <div className="divide-y divide-slate-800 text-xs">
                      {report.top_venues.map((v, i) => (
                        <div key={v.id} className="py-2 flex justify-between gap-3">
                          <span className="text-slate-300 truncate">
                            {i + 1}. <b className="text-white">{v.name}</b> · {v.district}
                          </span>
                          <span className="text-white font-bold tabular-nums shrink-0">
                            {vnd(v.gross)} <span className="text-slate-500 font-normal">· {v.bookings} đơn</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </AdminCard>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};
