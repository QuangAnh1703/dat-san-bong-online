import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { errorMessage, needsProfileSetup, useApp } from '../context/AppContext';

const ERRORS = {
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên.',
  GOOGLE_LOGIN_FAILED: 'Đăng nhập Google thất bại, vui lòng thử lại.',
};

// Backend redirect về đây sau khi Google xác thực: ?access_token=&refresh_token= hoặc ?error=
export const GoogleCallbackPage = () => {
  const { completeOAuthLogin, showToast, setIsAuthModalOpen } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // StrictMode chạy effect hai lần khi dev
    if (handled.current) return;
    handled.current = true;

    const fail = (msg) => {
      showToast(msg, 'error');
      navigate('/', { replace: true });
      setIsAuthModalOpen(true);
    };

    const error = params.get('error');
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (error || !access) {
      fail(ERRORS[error] || ERRORS.GOOGLE_LOGIN_FAILED);
      return;
    }

    completeOAuthLogin(access, refresh)
      .then((profile) => {
        showToast('Đăng nhập Google thành công!');
        if (needsProfileSetup(profile)) {
          navigate('/ho-so', { replace: true });
          showToast('Chào mừng bạn! Hãy cập nhật khu vực, trình độ và vị trí sở trường để được gợi ý sân phù hợp.');
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch((err) => fail(errorMessage(err)));
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
      <span>Đang đăng nhập bằng Google...</span>
    </main>
  );
};
