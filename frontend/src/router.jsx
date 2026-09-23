import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './features/home/HomePage';
import { GoogleCallbackPage } from './features/auth/GoogleCallbackPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
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
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/google-callback', element: <GoogleCallbackPage /> },
      { path: 'tim-san', element: <ComingSoonPage code="WF-02" title="Ket qua tim kiem & bo loc" /> },
      { path: 'san/:id', element: <ComingSoonPage code="WF-03" title="Chi tiet san & so do lich real-time" /> },
      { path: 'thanh-toan/:code', element: <ComingSoonPage code="WF-04" title="Xac nhan & thanh toan tien coc" /> },
      { path: 'dat-dinh-ky', element: <ComingSoonPage code="WF-05" title="Dat san dinh ky" /> },
      { path: 'lich-cua-toi', element: <ComingSoonPage code="WF-06" title="Quan ly lich da & danh gia" /> },
      { path: 'giao-huu', element: <ComingSoonPage code="WF-07" title="Tim doi giao huu" /> },
      { path: 'ghep-chan-le', element: <ComingSoonPage code="WF-08" title="Ghep chan le" /> },
      { path: 'ho-so', element: <ComingSoonPage code="WF-09" title="Ho so & diem uy tin" /> },
      { path: 'chu-san', element: <ComingSoonPage code="WF-10" title="Dashboard doanh thu chu san" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
