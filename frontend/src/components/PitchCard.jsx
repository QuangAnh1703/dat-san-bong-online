import React from 'react';
import { MapPin, Star, Phone, Car, Droplets, Utensils, Award, Clock, ArrowRight } from 'lucide-react';

export const PitchCard = ({ pitch, onSelect, isNearest }) => {
  // Count total available slots today
  const availableSlotsCount = pitch.subPitches.reduce((acc, sub) => {
    return acc + sub.slots.filter((s) => s.status === 'available').length;
  }, 0);

  return (
    <div className="bg-slate-900/90 rounded-2xl overflow-hidden border border-emerald-950/80 hover:border-emerald-700/60 shadow-xl transition-all duration-200 flex flex-col justify-between group">
      {/* Pitch image with overlay tags */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
        <img
          src={pitch.image}
          alt={pitch.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {isNearest ? (
            <span className="px-2.5 py-1 text-[0.8125rem] font-bold rounded-lg bg-emerald-600 text-white shadow-md">
              📍 Gần bạn nhất ({pitch.distanceKm} km)
            </span>
          ) : pitch.isPopular ? (
            <span className="px-2.5 py-1 text-[0.8125rem] font-bold rounded-lg bg-amber-500 text-slate-950 shadow-md">
              ⭐ Cụm sân nổi bật
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[0.8125rem] font-bold rounded-lg bg-slate-900/80 text-slate-200 backdrop-blur-sm border border-slate-700">
              {pitch.subPitches.length} sân con
            </span>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{pitch.rating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({pitch.reviewCount})</span>
          </div>
        </div>

        {/* Bottom image metadata */}
        <div className="absolute bottom-3 left-3 right-3 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mở cửa: {pitch.openingHours}</span>
          </div>
          <div className="text-emerald-400 font-bold">{availableSlotsCount} slot trống hôm nay</div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Pitch Name */}
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">{pitch.name}</h3>

          {/* Address */}
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5 mb-3.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              {pitch.address.includes(pitch.district) ? pitch.address : `${pitch.address}, ${pitch.district}`}
            </span>
          </div>

          {/* Sub-pitches list */}
          <div className="mb-4 space-y-1.5">
            <div className="text-[0.8125rem] font-semibold text-slate-400 uppercase tracking-wider">Các sân thi đấu:</div>
            <div className="flex flex-wrap gap-1.5">
              {pitch.subPitches.map((sub) => (
                <span
                  key={sub.id}
                  className="px-2 py-1 text-[0.8125rem] font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {sub.name}
                </span>
              ))}
            </div>
          </div>

          {/* Amenities icons */}
          <div className="flex items-center gap-3 py-2.5 border-y border-slate-800 text-xs text-slate-400">
            {pitch.hasParking && (
              <span className="flex items-center gap-1" title="Có bãi gửi ô tô & xe máy rộng">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bãi xe</span>
              </span>
            )}
            {pitch.hasShower && (
              <span className="flex items-center gap-1" title="Phòng tắm nóng lạnh">
                <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tắm nóng</span>
              </span>
            )}
            {pitch.hasCanteen && (
              <span className="flex items-center gap-1" title="Căng tin nước ngọt, đồ ăn nhẹ">
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                <span>Căng tin</span>
              </span>
            )}
            {pitch.hasReferee && (
              <span className="flex items-center gap-1" title="Hỗ trợ trọng tài">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trọng tài</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer with Price and Action */}
        <div className="mt-4 pt-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.75rem] text-slate-400 font-medium">Giá mỗi trận 90 phút</div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-400 tabular-nums font-display">
              {pitch.maxPrice > 0
                ? `${pitch.minPrice.toLocaleString('vi-VN')}đ - ${pitch.maxPrice.toLocaleString('vi-VN')}đ`
                : 'Chưa có bảng giá'}
            </div>
          </div>

          <button
            onClick={() => onSelect(pitch)}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950 active:scale-95 whitespace-nowrap"
          >
            <span>Xem lịch trống</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
