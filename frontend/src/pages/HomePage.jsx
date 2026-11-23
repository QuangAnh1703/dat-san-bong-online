import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { HeroSection } from '../components/HeroSection';
import { SmartRecommendationSection } from '../components/SmartRecommendationSection';
import { PitchCard } from '../components/PitchCard';
import { Sparkles, MapPin, Calendar, CheckCircle2, Shield, Zap, Clock, AlertCircle, Loader2 } from 'lucide-react';

const FEATURED_COUNT = 6;

// Thứ tự ngẫu nhiên nhưng cố định theo seed, để danh sách không nhảy khi dữ liệu sân được tải lại
const seededRank = (id, seed) => {
  let h = Math.floor(seed * 2 ** 31);
  for (const ch of String(id)) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0) % 2 ** 31;
  return h;
};

// Ưu tiên mỗi quận một sân cho đa dạng, thiếu thì lấy thêm sân còn lại
function pickFeatured(pitches, seed) {
  const shuffled = [...pitches].sort((a, b) => seededRank(a.id, seed) - seededRank(b.id, seed));
  const seen = new Set();
  const picked = shuffled.filter((p) => !seen.has(p.district) && seen.add(p.district)).slice(0, FEATURED_COUNT);
  for (const p of shuffled) {
    if (picked.length >= FEATURED_COUNT) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked;
}

export const HomePage = ({ onNavigateSection }) => {
  const {
    pitches,
    pitchesLoading,
    pitchesError,
    reloadPitches,
    searchKeyword,
    selectedDistrict,
    selectedPitchType,
    gpsActive,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Bấm menu từ trang khác: về trang chủ rồi cuộn tới section được yêu cầu
  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  // Filter pitches based on search inputs
  const filteredPitches = pitches.filter((pitch) => {
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = pitch.name.toLowerCase().includes(kw);
      const matchAddr = pitch.address.toLowerCase().includes(kw);
      const matchDist = pitch.district.toLowerCase().includes(kw);
      if (!matchName && !matchAddr && !matchDist) return false;
    }

    if (selectedDistrict !== 'all' && pitch.district !== selectedDistrict) {
      return false;
    }

    if (selectedPitchType !== 'all') {
      const hasSubPitchType = pitch.subPitches.some((sub) => sub.type === selectedPitchType);
      if (!hasSubPitchType) return false;
    }

    return true;
  });

  // If GPS is active, sort by distance
  const matchedPitches = [...filteredPitches].sort((a, b) => {
    if (gpsActive) {
      return (a.distanceKm || 99) - (b.distanceKm || 99);
    }
    return 0;
  });

  // Chưa tìm/lọc gì: chỉ hiện vài sân tiêu biểu, đổi ngẫu nhiên mỗi lần tải trang
  const [showAll, setShowAll] = useState(false);
  const [shuffleSeed] = useState(() => Math.random());
  const isSearching =
    showAll || gpsActive || searchKeyword.trim() !== '' || selectedDistrict !== 'all' || selectedPitchType !== 'all';
  const featuredPitches = useMemo(() => pickFeatured(pitches, shuffleSeed), [pitches, shuffleSeed]);
  const displayedPitches = isSearching ? matchedPitches : featuredPitches;

  const handleSearchSubmit = () => {
    setShowAll(true);
    onNavigateSection('search-pitches');
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* 1. Hero Section with visual background & search */}
      <HeroSection onSearchSubmit={handleSearchSubmit} />

      {/* Smart Recommendation Kicker Bar */}
      <div className="w-full bg-emerald-950/40 border-b border-emerald-900/60 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Hệ thống đặt sân bóng thông minh:</span>
            <span className="text-slate-300 font-normal">
              Chốt sân trong 60 giây · Giữ chỗ an toàn 15 phút · Đặt cọc online qua SePay
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[0.8125rem]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Không cần gọi điện
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Cáp kèo đúng trình độ
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Bảo hiểm hoàn cọc 100%
            </span>
          </div>
        </div>
      </div>


      {/* 2. Smart Recommendations Section (Feature 2: Gợi ý theo GPS, Lịch sử, Ngân sách) */}
      <SmartRecommendationSection />

      {/* 3. Pitch Catalog & Smart Grid */}
      <section id="search-pitches" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4" />
              <span>
                {gpsActive
                  ? 'Đang lọc sân gần vị trí của bạn (< 5km)'
                  : isSearching
                    ? 'Mạng lưới sân bóng liên kết'
                    : 'Gợi ý ngẫu nhiên mỗi lần ghé thăm'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-display">
              {isSearching ? 'Sân Bóng Đang Mở Đặt Chỗ' : 'Sân Bóng Tiêu Biểu'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Xem chi tiết từng sân con, chất lượng mặt cỏ FIFA, dàn đèn và bảng giờ trống.
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {isSearching ? (
              <>
                Tìm thấy <strong className="text-emerald-400 font-bold">{displayedPitches.length} cụm sân</strong> phù hợp
              </>
            ) : (
              <>
                Đang hiện <strong className="text-emerald-400 font-bold">{displayedPitches.length}</strong> /{' '}
                {pitches.length} cụm sân
              </>
            )}
          </div>
        </div>

        {pitchesError ? (
          <div className="text-center py-16 bg-slate-900 rounded-3xl border border-rose-900 p-8">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Không tải được danh sách sân</h3>
            <p className="text-xs text-slate-400 mt-1">{pitchesError}</p>
            <button
              onClick={() => reloadPitches()}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : pitchesLoading && pitches.length === 0 ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang tải danh sách sân...</span>
          </div>
        ) : displayedPitches.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 p-8">
            <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Không tìm thấy sân bóng phù hợp</h3>
            <p className="text-xs text-slate-400 mt-1">
              Vui lòng thử chọn quận huyện khác hoặc đổi loại sân (5, 7, 11 người).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {displayedPitches.map((pitch, idx) => (
              <PitchCard
                key={pitch.id}
                pitch={pitch}
                onSelect={(p) => navigate(`/san/${p.id}`)}
                isNearest={gpsActive && idx === 0}
              />
            ))}
          </div>
        )}

        {!pitchesError && pitches.length > FEATURED_COUNT && (!isSearching || showAll) && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-6 py-3 rounded-xl border border-emerald-700 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs cursor-pointer transition-colors"
            >
              {showAll ? 'Thu gọn, chỉ xem sân tiêu biểu' : `Xem tất cả ${pitches.length} cụm sân`}
            </button>
          </div>
        )}
      </section>


      {/* 4. Recurring Booking Callout Banner (Feature 6: Đặt sân định kỳ) */}
      <section className="w-full py-14 bg-gradient-to-r from-emerald-950 via-[#0d1a12] to-slate-950 border-y border-emerald-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-700">
              <Calendar className="w-3.5 h-3.5" />
              <span>Dành riêng cho đội bóng cố định (FC Công ty, FC Bạn học)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Đá Quanh Năm Khung Giờ Vàng · Giảm Đến 15%
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Không còn cảnh tuần nào cũng phải tranh giành hay thấp thỏm bị hủy slot. Ký hợp đồng giữ sân cố định (ví
              dụ Thứ 3 & Thứ 6 lúc 19:00), hệ thống tự động khóa sân và áp dụng mức chiết khấu thành viên quen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => navigate('/dat-dinh-ky')}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-950 transition-all active:scale-95 whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              <span>Đăng ký giữ sân cố định</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Why SanBong.id.vn Value Pillars */}
      <section className="w-full py-16 bg-[#0b130e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Lợi Ích Kép Cho Cả Người Chơi & Chủ Sân
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              SanBong.id.vn chuẩn hóa quy trình vận hành sân bóng phong trào số 1 Việt Nam.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">01. Đặt sân trong 60 giây</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Xem lịch trống trực quan từng sân con, giữ chỗ 15 phút không ai tranh được, cọc online nhanh gọn qua
                SePay (thẻ ATM, Visa, QR ngân hàng) 24/7.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">02. Giá lưu động thông minh</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Thuật toán tự động kích hoạt Flash Sale cho các khung giờ vắng và sân trống sát giờ bóng lăn, giúp chủ
                sân lấp đầy công suất và đội bóng tiết kiệm chi phí.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">03. Cáp kèo ngang trình & Hoàn cọc</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ sinh thái kết nối hàng trăm đội bóng phủi theo đúng trình độ (vui vẻ, trung bình, phủi cứng), bảo
                hiểm hoàn cọc 100% khi gặp thời tiết mưa ngập sân.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
