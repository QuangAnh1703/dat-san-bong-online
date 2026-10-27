import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { VenueDetailPage } from './pages/VenueDetailPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { FlashSalePage } from './pages/FlashSalePage';
import { MatchmakingPage } from './pages/MatchmakingPage';
import { FreelancePage } from './pages/FreelancePage';
import { RecruitPostPage } from './pages/RecruitPostPage';
import { PlayerPostPage } from './pages/PlayerPostPage';
import { ChallengePostPage } from './pages/ChallengePostPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { OwnerBookingsPage } from './pages/OwnerBookingsPage';
import { OwnerSchedulePage } from './pages/OwnerSchedulePage';
import { OwnerPricingPage } from './pages/OwnerPricingPage';
import { OwnerVenuesPage } from './pages/OwnerVenuesPage';
import { OwnerVenueFormPage } from './pages/OwnerVenueFormPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { MessagesPage } from './pages/MessagesPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { AdminComplaintDetailPage } from './pages/AdminComplaintDetailPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminOwnerRequestsPage } from './pages/AdminOwnerRequestsPage';
import { AdminVenuesPage } from './pages/AdminVenuesPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { OwnerServicesPage } from './pages/OwnerServicesPage';
import { OwnerMembershipPage } from './pages/OwnerMembershipPage';
import { OwnerTournamentsPage } from './pages/OwnerTournamentsPage';
import { SplitBillPage } from './pages/SplitBillPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { AdminWalletsPage } from './pages/AdminWalletsPage';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Trang cần tài khoản: chưa đăng nhập thì về trang chủ và mở hộp thoại đăng nhập
const RequireAuth = ({ children }) => {
  const { isLoggedIn, authLoading, setIsAuthModalOpen } = useApp();
  useEffect(() => {
    if (!authLoading && !isLoggedIn) setIsAuthModalOpen(true);
  }, [authLoading, isLoggedIn]);
  if (authLoading) return <main className="flex-1" />;
  return isLoggedIn ? children : <Navigate to="/" replace />;
};

// Trang quản lý của chủ sân: vai trò khác thì về trang chủ
const RequireOwner = ({ children }) => {
  const { role, authLoading } = useApp();
  if (authLoading) return <main className="flex-1" />;
  return role === 'owner' ? children : <Navigate to="/" replace />;
};

// Trang quản trị: chỉ khi đang ở giao diện admin
const RequireAdmin = ({ children }) => {
  const { role, authLoading } = useApp();
  if (authLoading) return <main className="flex-1" />;
  return role === 'admin' ? children : <Navigate to="/" replace />;
};

const OWNER_PAGES = [
  ['/chu-san/don-dat', OwnerBookingsPage],
  ['/chu-san/lich', OwnerSchedulePage],
  ['/chu-san/bang-gia', OwnerPricingPage],
  ['/chu-san/cum-san', OwnerVenuesPage],
  ['/chu-san/cum-san/moi', OwnerVenueFormPage],
  ['/chu-san/cum-san/:id', OwnerVenueFormPage],
  ['/chu-san/doi-soat', ReconciliationPage],
  ['/chu-san/dich-vu', OwnerServicesPage],
  ['/chu-san/goi-thanh-vien', OwnerMembershipPage],
  ['/chu-san/giai-dau', OwnerTournamentsPage],
];

const ADMIN_PAGES = [
  ['/quan-tri/nguoi-dung', AdminUsersPage],
  ['/quan-tri/chu-san', AdminOwnerRequestsPage],
  ['/quan-tri/cum-san', AdminVenuesPage],
  ['/quan-tri/khieu-nai', AdminComplaintsPage],
  ['/quan-tri/khieu-nai/:id', AdminComplaintDetailPage],
  ['/quan-tri/bao-cao', AdminReportsPage],
  ['/quan-tri/doi-soat', ReconciliationPage],
  ['/quan-tri/vi-hoi-vien', AdminWalletsPage],
];

const Shell = () => {
  const { role, isAuthModalOpen, setIsAuthModalOpen, toastMessage, toastTone } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleNavigateSection = (sectionId) => {
    if (pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const home =
    role === 'owner' ? (
      <OwnerDashboard />
    ) : role === 'admin' ? (
      <AdminDashboard />
    ) : (
      <HomePage onNavigateSection={handleNavigateSection} />
    );

  return (
    // pb-16: chừa chỗ cho thanh tab đáy trên mobile
    <div className="min-h-screen bg-[#0b130e] text-slate-100 flex flex-col antialiased pb-16 lg:pb-0">
      {toastMessage && (
        <div
          className={`fixed bottom-20 lg:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-[60] px-4 py-3 rounded-2xl text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
            toastTone === 'error' ? 'bg-rose-600 shadow-rose-950' : 'bg-emerald-600 shadow-emerald-950'
          }`}
        >
          {toastTone === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      <Navbar onNavigateSection={handleNavigateSection} />

      <Routes>
        <Route path="/" element={home} />
        <Route path="/san/:id" element={<VenueDetailPage />} />
        <Route path="/dat-dinh-ky" element={<SubscriptionPage />} />
        <Route path="/keo-gap" element={<FlashSalePage />} />
        <Route path="/giao-huu" element={<MatchmakingPage />} />
        <Route
          path="/giao-huu/dang-tin"
          element={
            <RequireAuth>
              <ChallengePostPage />
            </RequireAuth>
          }
        />
        <Route path="/ghep-chan-le" element={<FreelancePage />} />
        <Route
          path="/ghep-chan-le/dang-tuyen"
          element={
            <RequireAuth>
              <RecruitPostPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ghep-chan-le/dang-tin"
          element={
            <RequireAuth>
              <PlayerPostPage />
            </RequireAuth>
          }
        />
        <Route path="/bang-xep-hang" element={<LeaderboardPage />} />
        <Route path="/giai-dau/:id" element={<TournamentDetailPage />} />
        <Route
          path="/chia-tien/:code"
          element={
            <RequireAuth>
              <SplitBillPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lich-cua-toi"
          element={
            <RequireAuth>
              <MyBookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/ho-so"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />
        <Route path="/thanh-toan/ket-qua" element={<PaymentResultPage />} />
        {['/tin-nhan', '/tin-nhan/:id'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireAuth>
                <MessagesPage />
              </RequireAuth>
            }
          />
        ))}
        <Route
          path="/khieu-nai"
          element={
            <RequireAuth>
              <ComplaintsPage />
            </RequireAuth>
          }
        />
        {OWNER_PAGES.map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireOwner>
                <Page />
              </RequireOwner>
            }
          />
        ))}
        {ADMIN_PAGES.map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireAdmin>
                <Page />
              </RequireAdmin>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      <Footer onNavigateSection={handleNavigateSection} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
