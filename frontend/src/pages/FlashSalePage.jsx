import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { errorMessage } from '../context/AppContext';
import { buildSlots, mapVenue, toLocalISODate } from '../services/mappers';
import { Zap, Clock, MapPin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { PageLayout } from '../components/ui/PageLayout';

const MAX_DEALS = 30;
const REFRESH_MS = 5 * 60 * 1000;

// Cửa sổ Flash Sale có thể vắt qua nửa đêm nên dựng slot cho cả hôm nay và ngày mai
function collectDeals(venues) {
  const now = new Date();
  const dates = [toLocalISODate(now), toLocalISODate(new Date(now.getTime() + 86_400_000))];
  const deals = [];
  let nextOpen = null;
  for (const raw of venues) {
    const pitch = mapVenue(raw);
    const f = pitch.flashSale;
    for (const sub of pitch.subPitches) {
      const schedule = raw.schedule.filter((s) => String(s.field_id) === sub.id);
      for (const date of dates) {
        for (const slot of buildSlots(pitch, sub, date, schedule)) {
          if (slot.status !== 'available') continue;
          if (slot.isFlashSale) {
            deals.push({ pitch, subPitch: sub, slot, date });
            continue;
          }
          // Slot trống chưa tới cửa sổ giảm giá: ghi lại lúc sớm nhất nó thành kèo gấp
          if (!f || (f.fieldType && f.fieldType !== sub.type)) continue;
          const [h, m] = slot.startTime.split(':').map(Number);
          if (f.timeSpans && !f.timeSpans.some((t) => h * 60 + m >= t.fromMinute && h * 60 + m < t.toMinute)) continue;
          const [y, mo, d] = date.split('-').map(Number);
          const opensAt = new Date(y, mo - 1, d, h, m).getTime() - f.triggerHoursBefore * 3_600_000;
          if (opensAt > now.getTime() && (nextOpen === null || opensAt < nextOpen)) nextOpen = opensAt;
        }
      }
    }
  }
  // Mỗi cụm sân chỉ giữ kèo sớm nhất để danh sách không bị một sân chiếm hết
  const startOf = (d) => `${d.date} ${d.slot.startTime}`;
  const seen = new Set();
  const list = deals
    .sort((a, b) => startOf(a).localeCompare(startOf(b)))
    .filter((d) => !seen.has(d.pitch.id) && seen.add(d.pitch.id))
    .slice(0, MAX_DEALS);
  return { deals: list, nextOpen: nextOpen && new Date(nextOpen) };
}

const nextOpenLabel = (at) => {
  const time = at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return toLocalISODate(at) === toLocalISODate(new Date()) ? `${time} hôm nay` : `${time} ngày mai`;
};

export const FlashSalePage = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [nextOpen, setNextOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiClient.venues
        .getFlashSales()
        .then((res) => {
          if (cancelled) return;
          const out = collectDeals(res.data || []);
          setDeals(out.deals);
          setNextOpen(out.nextOpen);
          setError(null);
        })
        .catch((err) => !cancelled && setError(errorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    setLoading(true);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reloadKey]);

  const maxPercent = deals.reduce(
    (m, { slot }) => Math.max(m, Math.round(((slot.originalPrice - slot.price) / slot.originalPrice) * 100)),
    0
  );
  const today = toLocalISODate(new Date());

  return (
    <PageLayout
      backTo="/"
      tone="amber"
      eyebrow="Giá lưu động sát giờ"
      icon={Zap}
      title={`Kèo gấp giá hời${maxPercent > 0 ? ` · Giảm đến ${maxPercent}%` : ''}`}
      description="Sân còn trống sát giờ đá được chủ sân tự động giảm giá. Mỗi cụm sân hiển thị kèo sớm nhất, tự cập nhật mỗi 5 phút."
    >

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tìm kèo gấp...</span>
        </div>
      ) : error && deals.length === 0 ? (
        <div className="rounded-2xl border border-rose-900 bg-slate-900 px-4 py-8 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-200">Không tải được danh sách kèo gấp</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-900/50 bg-slate-900/50 px-4 py-8 text-center">
          <Zap className="w-6 h-6 text-amber-500/60 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-200">Hiện chưa có kèo gấp nào sắp diễn ra</p>
          <p className="text-xs text-slate-400 mt-1">
            Sân chỉ được giảm giá khi còn trống sát giờ đá (thường 2-3 tiếng trước giờ bóng lăn).
          </p>
          {nextOpen && (
            <p className="text-xs text-amber-300 font-semibold mt-2">
              Kèo gấp tiếp theo dự kiến mở lúc {nextOpenLabel(nextOpen)}.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map(({ pitch, subPitch, slot, date }) => {
            const discountPercent = Math.round(((slot.originalPrice - slot.price) / slot.originalPrice) * 100);

            return (
              <div
                key={slot.id}
                className="relative bg-slate-900/90 rounded-2xl p-5 border border-amber-500/30 shadow-lg hover:border-amber-400 transition-all flex flex-col justify-between group"
              >
                {/* Top badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    Giảm {discountPercent}%
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-300 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Sắp bóng lăn</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {pitch.name}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{pitch.district}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-400 font-medium">{subPitch.name}</span>
                  </div>

                  {/* Time and Price Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[0.8125rem] text-slate-400 font-medium">
                        {date === today ? 'Hôm nay' : 'Ngày mai'}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                    <div className="text-right">
                      {slot.originalPrice && (
                        <div className="text-xs text-slate-500 line-through tabular-nums">
                          {slot.originalPrice.toLocaleString('vi-VN')}đ
                        </div>
                      )}
                      <div className="text-base font-extrabold text-amber-400 font-display tabular-nums">
                        {slot.price.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/san/${pitch.id}`)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Chốt sân kèo gấp này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};
