import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Sparkles, MapPin, History, Wallet, Navigation, Clock, Star, ArrowRight, Check } from 'lucide-react';

export const SmartRecommendationSection = () => {
  const { pitches, bookings, gpsActive, setGpsActive } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('history');
  const [selectedBudget, setSelectedBudget] = useState('standard');

  // Pitches categorized by budget
  const studentPitches = pitches.filter((p) => p.minPrice <= 300000);
  const standardPitches = pitches.filter((p) => p.minPrice <= 550000);
  const vipPitches = pitches.filter((p) => p.maxPrice >= 650000);

  // Sân quen = cụm sân đặt nhiều nhất trong lịch sử (bỏ qua đơn đã hủy)
  const visitCount = new Map();
  bookings
    .filter((b) => b.status !== 'cancelled')
    .forEach((b) => visitCount.set(b.pitchId, (visitCount.get(b.pitchId) || 0) + 1));
  const [favoriteId, favoriteCount] = [...visitCount.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  const favoritePitch = pitches.find((p) => p.id === favoriteId);
  const lastBookingAtFavorite = bookings.find((b) => b.pitchId === favoriteId);

  const nearbyPitches = [...pitches]
    .filter((p) => p.distanceKm != null)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
    .slice(0, 3);

  const budgetPitches =
    selectedBudget === 'student' ? studentPitches : selectedBudget === 'standard' ? standardPitches : vipPitches;

  return (
    <section className="w-full py-12 bg-[#09100c] border-b border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Gợi ý thông minh (Smart Recommendation Engine)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Sân Bóng Được Đề Xuất Riêng Cho Bạn
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Hệ thống tự động phân tích <strong className="text-emerald-300">Vị trí GPS</strong>,{' '}
              <strong className="text-emerald-300">Lịch sử đặt sân</strong> của đội bóng và{' '}
              <strong className="text-emerald-300">Ngân sách thường dùng</strong>.
            </p>
          </div>
        </div>

        {/* 3 Suggestion Mode Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-lg text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>1. Lịch sử đặt sân</span>
              </span>
              <span className="text-[0.75rem] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 font-bold">
                Sân quen
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">{favoritePitch?.name || 'Chưa có dữ liệu'}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {favoritePitch ? `Bạn đã đặt ${favoriteCount} lần` : 'Đặt sân để nhận gợi ý'}
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('gps');
              setGpsActive(true);
            }}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
              activeTab === 'gps'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-lg text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>2. Vị trí gần bạn nhất (GPS)</span>
              </span>
              <span className="text-[0.75rem] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold">&lt; 1km</span>
            </div>
            <div className="text-sm font-bold text-white">Bán kính di chuyển 5-10 phút</div>
            <div className="text-xs text-slate-400 mt-0.5">Ưu tiên sân sát nhà, tiết kiệm thời gian di chuyển</div>
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
              activeTab === 'budget'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-lg text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>3. Ngân sách đội bóng</span>
              </span>
              <span className="text-[0.75rem] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold">
                Tối ưu chi phí
              </span>
            </div>
            <div className="text-sm font-bold text-white">Từ 220k - 600k / trận</div>
            <div className="text-xs text-slate-400 mt-0.5">Phù hợp ngân sách sinh viên & văn phòng</div>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'history' && (
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-emerald-900/60 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in fade-in duration-150">
            {favoritePitch ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-[0.8125rem] font-bold">
                      Sân quen của bạn
                    </span>
                    <span className="text-xs text-slate-400">Đã đặt {favoriteCount} lần</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {favoritePitch.name} · {favoritePitch.district}
                  </h3>
                  {lastBookingAtFavorite?.startTime && (
                    <p className="text-xs text-slate-300">
                      Khung giờ gần nhất:{' '}
                      <strong className="text-emerald-400">
                        {lastBookingAtFavorite.startTime} - {lastBookingAtFavorite.endTime}
                      </strong>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/san/${favoritePitch.id}`)}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 shrink-0 transition-all active:scale-95"
                >
                  <span>Đặt lại sân quen ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Chưa có lịch sử đặt sân. Sau khi bạn đặt sân, hệ thống sẽ gợi ý sân quen ở đây.
              </p>
            )}
          </div>
        )}

        {activeTab === 'gps' && (
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-cyan-900/60 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span className="flex items-center gap-1.5 font-bold">
                <MapPin className="w-4 h-4 text-cyan-400" />
                {gpsActive ? 'Đã lấy vị trí hiện tại của bạn' : 'Chưa bật định vị'}
              </span>
              <span>Khoảng cách đường chim bay</span>
            </div>

            {nearbyPitches.length === 0 && (
              <p className="text-xs text-slate-400">
                {gpsActive
                  ? 'Các sân chưa có tọa độ để tính khoảng cách.'
                  : 'Hãy cho phép trình duyệt truy cập vị trí để xem sân gần bạn.'}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nearbyPitches.map((pitch) => (
                <div
                  key={pitch.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-400">{pitch.distanceKm} km</span>
                      <span className="text-[0.8125rem] text-slate-400">
                        ~{Math.round((pitch.distanceKm || 1) * 3 + 2)} phút xe
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white truncate">{pitch.name}</div>
                    <div className="text-[0.8125rem] text-slate-400 truncate mt-0.5">{pitch.address}</div>
                  </div>

                  <button
                    onClick={() => navigate(`/san/${pitch.id}`)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Xem lịch sân này
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-amber-900/60 space-y-4 animate-in fade-in duration-150">
            {/* Budget filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-semibold shrink-0">Chọn mức chi phí:</span>
              <button
                onClick={() => setSelectedBudget('student')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  selectedBudget === 'student'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Học sinh / Sinh viên (&lt; 300k/trận)
              </button>
              <button
                onClick={() => setSelectedBudget('standard')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  selectedBudget === 'standard'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Tiêu chuẩn phủi phong trào (300k - 580k/trận)
              </button>
              <button
                onClick={() => setSelectedBudget('vip')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  selectedBudget === 'vip'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                VIP Sân chuẩn thi đấu (&gt; 600k/trận)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {budgetPitches.map((pitch) => (
                <div
                  key={pitch.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-white truncate max-w-[11rem]">{pitch.name}</div>
                    <div className="text-xs text-amber-400 font-extrabold mt-0.5 tabular-nums">
                      {pitch.minPrice.toLocaleString('vi-VN')}đ - {pitch.maxPrice.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/san/${pitch.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    Chọn sân
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
