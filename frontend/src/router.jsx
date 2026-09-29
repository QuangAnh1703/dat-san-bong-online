import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './features/home/HomePage';
import SearchPage from './features/search/SearchPage';
import VenueDetailPage from './features/venue/VenueDetailPage';
import PaymentPage from './features/payment/PaymentPage';
import SubscriptionPage from './features/subscription/SubscriptionPage';
import MyBookingsPage from './features/bookings/MyBookingsPage';
import FindTeamPage from './features/team/FindTeamPage';
import MatchmakingPage from './features/matchmaking/MatchmakingPage';
import ProfilePage from './features/profile/ProfilePage';
import { GoogleCallbackPage } from './features/auth/GoogleCallbackPage';
import { UnifiedAuthPage } from './features/auth/UnifiedAuthPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OnboardingPage } from './features/auth/OnboardingPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { OwnerDashboard } from './features/owner/OwnerDashboard';
import PricingManagement from './features/pricing/PricingManagement';
import ComingSoonPage from './pages/ComingSoonPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Mot route cho moi wireframe. Man hinh chua lam dung ComingSoonPage
 * de dieu huong van chay thong suot khi demo.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'auth', element: <UnifiedAuthPage /> },
      { path: 'auth/login', element: <UnifiedAuthPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/forgot-password', element: <ForgotPasswordPage /> },
      { path: 'auth/google-callback', element: <GoogleCallbackPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'auth/onboarding', element: <OnboardingPage /> },
      { path: 'chu-san', element: <OwnerDashboard /> },
      { path: 'chu-san/gia/:venueId', element: <PricingManagement /> },
      { path: 'tim-san', element: <SearchPage /> },
      { path: 'san/:id', element: <VenueDetailPage /> },
      { path: 'thanh-toan/:code', element: <PaymentPage /> },
      { path: 'dat-dinh-ky', element: <SubscriptionPage /> },
      { path: 'lich-cua-toi', element: <MyBookingsPage /> },
      { path: 'giao-huu', element: <FindTeamPage /> },
      { path: 'ghep-chan-le', element: <MatchmakingPage /> },
      { path: 'ho-so', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
