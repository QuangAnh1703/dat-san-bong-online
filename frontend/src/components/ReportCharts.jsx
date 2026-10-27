import React, { useState } from 'react';

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const short = (n) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} tỷ` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} tr` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);

const bucketLabel = (bucket, granularity) => {
  const [y, m, d] = bucket.split('-');
  return granularity === 'month' ? `${m}/${y}` : `${d}/${m}`;
};

// Một chuỗi doanh thu theo ngày / tháng: cột mảnh một màu, hover hoặc chạm để xem số
export const RevenueBars = ({ series, granularity, tone = 'emerald' }) => {
  const [active, setActive] = useState(null);
  const max = Math.max(...series.map((s) => s.gross), 1);
  const bar = tone === 'amber' ? 'bg-amber-500' : tone === 'cyan' ? 'bg-cyan-500' : 'bg-emerald-500';
  const cur = active !== null ? series[active] : null;
  // Nhãn trục x thưa ra để không chồng chữ
  const step = Math.max(1, Math.ceil(series.length / 8));

  return (
    <div className="text-xs">
      <div className="h-6 text-slate-300 tabular-nums" aria-live="polite">
        {cur ? (
          <span>
            <b className="text-white">{bucketLabel(cur.bucket, granularity)}</b> · {vnd(cur.gross)} · {cur.bookings} đơn
          </span>
        ) : (
          <span className="text-slate-500">Rê chuột hoặc chạm vào cột để xem chi tiết</span>
        )}
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between h-40 text-[0.6875rem] text-slate-500 tabular-nums text-right shrink-0">
          <span>{short(max)}</span>
          <span>{short(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="relative h-40 flex items-end gap-[2px] border-b border-slate-700"
            role="img"
            aria-label={`Biểu đồ doanh thu ${series.length} ${granularity === 'month' ? 'tháng' : 'ngày'}, cao nhất ${vnd(max)}`}
            onMouseLeave={() => setActive(null)}
          >
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-800 pointer-events-none" />
            {series.map((s, i) => (
              <button
                key={s.bucket}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`${bucketLabel(s.bucket, granularity)}: ${vnd(s.gross)}, ${s.bookings} đơn`}
                className="relative flex-1 h-full flex items-end cursor-pointer focus:outline-none group"
              >
                <span
                  className={`w-full max-w-6 mx-auto rounded-t ${bar} ${
                    active === null || active === i ? 'opacity-100' : 'opacity-40'
                  } group-focus-visible:ring-2 group-focus-visible:ring-white transition-opacity`}
                  style={{ height: s.gross > 0 ? `${Math.max(2, (s.gross / max) * 100)}%` : '0' }}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-[2px] mt-1 text-[0.6875rem] text-slate-500">
            {series.map((s, i) => (
              <span key={s.bucket} className="flex-1 text-center truncate">
                {i % step === 0 ? bucketLabel(s.bucket, granularity) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tỷ lệ lấp đầy theo khung giờ (thanh ngang, số ghi bên cạnh)
export const OccupancyBars = ({ bands, tone = 'emerald' }) => {
  const bar = tone === 'amber' ? 'bg-amber-500' : tone === 'cyan' ? 'bg-cyan-500' : 'bg-emerald-500';
  return (
    <div className="space-y-2.5 text-xs">
      {bands.map((o) => (
        <div key={o.label}>
          <div className="flex justify-between mb-1 text-slate-300">
            <span>{o.label}</span>
            <span className="font-bold text-white tabular-nums">{o.rate}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, o.rate)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};
