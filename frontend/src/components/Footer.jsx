import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';
import { LogoMark } from './ui/LogoMark';

export const Footer = ({ onNavigateSection }) => {
  return (
    <footer className="w-full bg-[#080d0a] border-t border-emerald-950 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Proposition */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <LogoMark className="w-8 h-8" />
              <span className="text-lg font-black text-white font-display">
                SanBong<span className="text-emerald-400">.vn</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Nền tảng công nghệ đặt sân bóng đá thông minh, cáp kèo phủi, đặt lịch cố định và tối ưu doanh thu cho chủ
              sân.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[0.8125rem]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bảo hiểm hoàn cọc 100% khi thời tiết xấu</span>
            </div>
          </div>

          {/* Col 2: For Players */}
          <div className="space-y-2.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">Dành Cho Đội Bóng</div>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigateSection('search-pitches')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  Tìm sân gần nhất (GPS)
                </button>
              </li>
              <li>
                <Link to="/keo-gap" className="hover:text-emerald-400 transition-colors">
                  Săn kèo gấp sát giờ giá hời
                </Link>
              </li>
              <li>
                <Link to="/giao-huu" className="hover:text-emerald-400 transition-colors">
                  Sàn cáp kèo & tìm đối thủ
                </Link>
              </li>
              <li>
                <a href="#rules" className="hover:text-emerald-400 transition-colors">
                  Quy chế giao lưu bóng đá phong trào
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: For Owners */}
          <div className="space-y-2.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">Dành Cho Chủ Sân</div>
            <ul className="space-y-1.5">
              <li>
                <a href="#partner" className="hover:text-emerald-400 transition-colors">
                  Đăng ký hợp tác cụm sân
                </a>
              </li>
              <li>
                <a href="#software" className="hover:text-emerald-400 transition-colors">
                  Phần mềm quản lý lịch sân real-time
                </a>
              </li>
              <li>
                <a href="#dynamic" className="hover:text-emerald-400 transition-colors">
                  Cơ chế giá lưu động chống trống sân
                </a>
              </li>
              <li>
                <a href="#payout" className="hover:text-emerald-400 transition-colors">
                  Thanh toán cọc qua SePay
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hotline */}
          <div className="space-y-2.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">Tổng Đài Hỗ Trợ 24/7</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-white">1900 8899 · 0988 123 456</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>hotro@sanbong.vn</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tầng 5, Keangnam Landmark 72, Hà Nội</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.8125rem] text-slate-500">
          <div>
            © 2026 SanBong.vn · Hệ thống vận hành sân bóng & cáp kèo số 1 Việt Nam. Bản quyền thuộc về SanBong Corp.
          </div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-slate-400">
              Điều khoản sử dụng
            </a>
            <span>·</span>
            <a href="#policy" className="hover:text-slate-400">
              Chính sách hoàn cọc
            </a>
            <span>·</span>
            <a href="#security" className="hover:text-slate-400">
              Bảo mật thông tin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
