import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { handleGoogleCallback } from '../../services/auth';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = handleGoogleCallback(searchParams);
      login(result);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google login failed');
      setLoading(false);
      setTimeout(() => navigate('/'), 3000);
    }
  }, [searchParams, login, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
          <p>Đang xử lý đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--error)' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>❌</div>
        <p>{error}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '8px' }}>Quay lại trang chủ...</p>
      </div>
    </div>
  );
}
