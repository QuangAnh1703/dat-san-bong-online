import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { NotificationBell } from './NotificationBell';
import {
  User,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Sliders,
  Users,
  UserPlus,
  Zap,
  LogOut,
  Search,
  FileText,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';

export const initialsOf = (name) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

const navCls = ({ isActive }) =>
  `flex items-center gap-1.5 transition-colors ${isActive ? 'text-emerald-400' : 'hover:text-emerald-400'}`;

const tabCls = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-1 transition-colors ${
    isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
  }`;

const ownerNavCls = ({ isActive }) =>
  `flex items-center gap-1.5 transition-colors ${isActive ? 'text-amber-400' : 'hover:text-amber-400'}`;

const ownerTabCls = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-1 transition-colors ${
    isActive ? 'text-amber-400' : 'text-slate-400 hover:text-white'
  }`;

// Menu chủ sân: cùng cấu trúc với menu người chơi (menu ngang trên desktop, tab đáy trên mobile)
const OWNER_LINKS = [
  { to: '/', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/chu-san/don-dat', label: 'Đơn đặt sân', short: 'Đơn đặt', icon: ClipboardList },
  { to: '/chu-san/lich', label: 'Lịch sân', short: 'Lịch sân', icon: CalendarDays },
  { to: '/chu-san/bang-gia', label: 'Bảng giá & Flash Sale', short: 'Bảng giá', icon: Sliders },
];

const adminNavCls = ({ isActive }) =>
  `flex items-center gap-1.5 transition-colors ${isActive ? 'text-cyan-400' : 'hover:text-cyan-400'}`;

const adminTabCls = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-1 transition-colors ${
    isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
  }`;

// Menu quản trị; `badge` là khóa số việc đang chờ (tính trong Navbar)
const ADMIN_LINKS = [
  { to: '/', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/quan-tri/nguoi-dung', label: 'Người dùng', short: 'Người dùng', icon: Users },
  { to: '/quan-tri/chu-san', label: 'Duyệt chủ sân', short: 'Chủ sân', icon: FileText, badge: 'owners' },
  { to: '/quan-tri/cum-san', label: 'Cụm sân', short: 'Cụm sân', icon: Building2, badge: 'venues' },
  { to: '/quan-tri/khieu-nai', label: 'Khiếu nại', short: 'Khiếu nại', icon: AlertTriangle, badge: 'complaints' },
  { to: '/quan-tri/bao-cao', label: 'Báo cáo', short: 'Báo cáo', icon: BarChart2 },
];

const AVATAR_BG = {
  player: 'bg-emerald-600 text-white',
  owner: 'bg-amber-500 text-slate-950',
  admin: 'bg-cyan-600 text-white',
};

export const Navbar = ({ onNavigateSection }) => {
  const { role, user, isLoggedIn, logout, bookings, setIsAuthModalOpen, ownerApplications, pendingVenues, complaints } =
    useApp();

  const activeBookingsCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'holding').length;
  const adminBadges = {
    owners: ownerApplications.length,
    venues: pendingVenues.length,
    complaints: complaints.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length,
  };

  // Trang cần đăng nhập: chưa đăng nhập thì mở hộp thoại thay vì chuyển trang
  const guarded = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0b130e]/95 backdrop-blur-md border-b border-emerald-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigateSection('hero')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-base tracking-tighter shadow-inner shadow-emerald-400/40 group-hover:bg-emerald-500 transition-colors">
              SB
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-display">
              SanBong<span className="text-emerald-400">.vn</span>
            </span>
          </button>

          {role === 'player' && (
            <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-[0.8125rem] xl:text-sm font-medium text-slate-300 whitespace-nowrap">
              <button
                onClick={() => onNavigateSection('search-pitches')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Tìm sân
              </button>
              <NavLink
                to="/keo-gap"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 transition-colors ${isActive ? 'text-amber-300' : 'text-amber-400 hover:text-amber-300'}`
                }
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Kèo gấp giá hời</span>
              </NavLink>
              <NavLink to="/giao-huu" className={navCls}>
                <Users className="w-3.5 h-3.5" />
                <span>Cáp kèo & Tìm đối</span>
              </NavLink>
              <NavLink to="/ghep-chan-le" className={navCls}>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Ghép chân lẻ</span>
              </NavLink>
              <NavLink to="/dat-dinh-ky" className={navCls}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Đặt định kỳ</span>
              </NavLink>
              <NavLink to="/lich-cua-toi" onClick={guarded} className={navCls}>
                <span>Lịch của tôi</span>
                {activeBookingsCount > 0 && (
                  <span className="px-1.5 text-[0.75rem] font-bold bg-emerald-500 text-slate-950 rounded-full tabular-nums">
                    {activeBookingsCount}
                  </span>
                )}
              </NavLink>
            </nav>
          )}

          {role === 'owner' && (
            <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
              {OWNER_LINKS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={ownerNavCls}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          )}

          {role === 'admin' && (
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-[0.8125rem] xl:text-sm font-medium text-slate-300 whitespace-nowrap">
              {ADMIN_LINKS.map(({ to, label, icon: Icon, end, badge }) => (
                <NavLink key={to} to={to} end={end} className={adminNavCls}>
                  <Icon className="w-3.5 h-3.5 hidden xl:block" />
                  <span>{label}</span>
                  {badge && adminBadges[badge] > 0 && (
                    <span className="px-1.5 text-[0.75rem] font-bold bg-rose-500 text-white rounded-full tabular-nums">
                      {adminBadges[badge]}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <NotificationBell />
                <NavLink
                  to="/ho-so"
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-lg border text-white text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-950 border-emerald-700'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                    }`
                  }
                >
                  <div
                    className={`w-6 h-6 rounded-md font-bold ${AVATAR_BG[role]} flex items-center justify-center text-[0.8125rem]`}
                  >
                    {initialsOf(user.name)}
                  </div>
                  <span className="hidden sm:inline lg:hidden xl:inline truncate max-w-[9rem]">
                    {user.name || user.phone}
                  </span>
                </NavLink>

                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile/tablet: thanh tab cố định ở đáy thay cho menu ngang */}
      {role === 'player' && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b130e]/95 backdrop-blur-md border-t border-emerald-950/70 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-6 h-16 text-[0.75rem] font-semibold">
            <NavLink to="/" end className={tabCls}>
              <Search className="w-5 h-5" />
              <span>Tìm sân</span>
            </NavLink>
            <NavLink to="/keo-gap" className={tabCls}>
              <Zap className="w-5 h-5" />
              <span>Kèo gấp</span>
            </NavLink>
            <NavLink to="/giao-huu" className={tabCls}>
              <Users className="w-5 h-5" />
              <span>Giao hữu</span>
            </NavLink>
            <NavLink to="/ghep-chan-le" className={tabCls}>
              <UserPlus className="w-5 h-5" />
              <span>Chân lẻ</span>
            </NavLink>
            <NavLink to="/lich-cua-toi" onClick={guarded} className={tabCls}>
              <span className="relative">
                <CalendarCheck className="w-5 h-5" />
                {activeBookingsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-4 text-[0.6875rem] leading-4 font-bold bg-emerald-500 text-slate-950 rounded-full tabular-nums">
                    {activeBookingsCount}
                  </span>
                )}
              </span>
              <span>Lịch</span>
            </NavLink>
            <NavLink to="/ho-so" onClick={guarded} className={tabCls}>
              <User className="w-5 h-5" />
              <span>Hồ sơ</span>
            </NavLink>
          </div>
        </nav>
      )}

      {role === 'owner' && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b130e]/95 backdrop-blur-md border-t border-amber-950/70 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-16 text-[0.8125rem] font-semibold">
            {OWNER_LINKS.map(({ to, short, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={ownerTabCls}>
                <Icon className="w-5 h-5" />
                <span>{short}</span>
              </NavLink>
            ))}
            <NavLink to="/ho-so" className={ownerTabCls}>
              <User className="w-5 h-5" />
              <span>Hồ sơ</span>
            </NavLink>
          </div>
        </nav>
      )}

      {role === 'admin' && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b130e]/95 backdrop-blur-md border-t border-cyan-950/70 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-6 h-16 text-[0.75rem] font-semibold">
            {ADMIN_LINKS.map(({ to, short, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} className={adminTabCls}>
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {badge && adminBadges[badge] > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-4 text-[0.6875rem] leading-4 font-bold bg-rose-500 text-white rounded-full tabular-nums">
                      {adminBadges[badge]}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{short}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  );
};
