import React from 'react';
import { SearchBar } from './SearchBar';
import heroImg from '../assets/images/hero_football_pitch_1790752166238.jpg';
import { ShieldCheck, Timer, Zap, Star } from 'lucide-react';

export const HeroSection = ({ onSearchSubmit }) => {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-[#0d1a12] pt-8 pb-16 sm:pb-24 border-b border-emerald-950"
    >
      {/* Background imagery with subtle overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="Sân bóng đá cỏ nhân tạo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity filter contrast-125"
        />
        {/* Striped pitch grass pattern simulation */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0b130e]/80 via-[#0b130e]/90 to-[#0b130e]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              rgba(16, 185, 129, 0.03),
              rgba(16, 185, 129, 0.03) 40px,
              rgba(6, 78, 59, 0.08) 40px,
              rgba(6, 78, 59, 0.08) 80px
            )`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl pt-4 pb-8 sm:pb-10">
          {/* Natural kicker */}
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>HÀ NỘI & TP.HCM</span>
            <span className="text-emerald-700">/</span>
            <span>4 CỤM SÂN TIÊU CHUẨN ĐANG MỞ</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5 font-display text-balance">
            Đặt sân trong 60 giây, <br className="hidden sm:inline" />
            không cần gọi điện.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mb-8">
            Xem lịch trống theo thời gian thực của từng sân con, giữ chỗ 15 phút và đặt cọc online. Hết lo đặt trùng sân,
            hết cảnh chờ chủ sân <span className="text-emerald-300 font-medium italic">"anh gọi lại sau nhé"</span>.
          </p>

          {/* 3 Proof Stats inline */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl pb-6 border-b border-emerald-900/60 mb-8">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tabular-nums">14</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">sân con đang hoạt động</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-display tabular-nums flex items-center gap-1">
                4.9
                <Star className="w-4 h-4 fill-emerald-400 inline" />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">đánh giá trung bình</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-display tabular-nums">15 phút</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">thời gian giữ chỗ an toàn</div>
            </div>
          </div>
        </div>

        {/* Embedded Search Engine */}
        <div className="relative -mt-2">
          <SearchBar onSearchSubmit={onSearchSubmit} />
        </div>
      </div>
    </section>
  );
};
