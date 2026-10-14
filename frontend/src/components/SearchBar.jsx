import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, MapPin, Users, Calendar, Clock, Navigation } from 'lucide-react';

export const SearchBar = ({ onSearchSubmit }) => {
  const {
    searchKeyword,
    setSearchKeyword,
    selectedDistrict,
    setSelectedDistrict,
    selectedPitchType,
    setSelectedPitchType,
    selectedDate,
    setSelectedDate,
    selectedTimeRange,
    setSelectedTimeRange,
    gpsActive,
    setGpsActive,
    districts,
  } = useApp();

  const handleGpsToggle = () => {
    // Bật GPS sẽ hỏi quyền vị trí; lỗi được báo trong context
    setGpsActive(!gpsActive);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit();
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200/80 text-slate-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Field 1: Tìm sân */}
          <div className="space-y-1">
            <label className="text-[0.8125rem] font-bold tracking-wider text-slate-600 flex items-center gap-1.5 uppercase">
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tìm sân</span>
            </label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tên sân, đường phố..."
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-colors"
            />
          </div>

          {/* Field 2: Khu vực */}
          <div className="space-y-1">
            <label className="text-[0.8125rem] font-bold tracking-wider text-slate-600 flex items-center gap-1.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Khu vực</span>
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả quận / huyện</option>
              {districts.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Field 3: Loại sân */}
          <div className="space-y-1">
            <label className="text-[0.8125rem] font-bold tracking-wider text-slate-600 flex items-center gap-1.5 uppercase">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Loại sân</span>
            </label>
            <select
              value={selectedPitchType}
              onChange={(e) => setSelectedPitchType(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả loại sân</option>
              <option value="5">Sân 5 người</option>
              <option value="7">Sân 7 người (Phổ biến)</option>
              <option value="11">Sân 11 người</option>
            </select>
          </div>

          {/* Field 4: Ngày đá */}
          <div className="space-y-1">
            <label className="text-[0.8125rem] font-bold tracking-wider text-slate-600 flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ngày đá</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 transition-colors cursor-pointer"
            />
          </div>

          {/* Field 5: Khung giờ & Submit */}
          <div className="space-y-1">
            <label className="text-[0.8125rem] font-bold tracking-wider text-slate-600 flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Khung giờ</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full h-11 px-3 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 transition-colors cursor-pointer"
              >
                <option value="all">Cả ngày</option>
                <option value="morning">Sáng (06:00 - 11:00)</option>
                <option value="afternoon">Chiều (15:00 - 17:30)</option>
                <option value="peak">Giờ vàng (17:30 - 21:00)</option>
                <option value="night">Đêm (21:00 - 23:30)</option>
              </select>

              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md shadow-emerald-700/20 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Tìm sân</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* GPS Location helper bar */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-300 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGpsToggle}
            className={`inline-flex items-center gap-1.5 font-medium cursor-pointer transition-colors ${
              gpsActive ? 'text-emerald-400 font-bold underline underline-offset-2' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsActive ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>
              {gpsActive
                ? 'Đang dùng vị trí GPS: Ngõ 9 Phạm Văn Đồng, Cầu Giấy'
                : 'Dùng vị trí hiện tại (GPS) để tìm sân gần nhất'}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[0.8125rem]">
          <span>• Giữ chỗ 5 phút</span>
          <span>• Đặt cọc 20-30% online</span>
          <span>• Hoàn cọc nếu mưa bão</span>
        </div>
      </div>
    </div>
  );
};
