import { useState } from 'react';
import { requestOtp, verifyOtp, registerWithOtp, getGoogleLoginUrl } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import './AuthModal.css';

const STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password',
};

export function EmailOtpRegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const { login } = useAuth();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestOtp({ email });
      setStep(STEPS.OTP);
      setOtp('');
      setAttemptsLeft(5);
    } catch (err) {
      setError(err.message || 'Yêu cầu OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await verifyOtp({ email, otp });
      setTempToken(res.temp_token);
      setStep(STEPS.PASSWORD);
      setOtp('');
    } catch (err) {
      const msg = err.message || 'Xác minh OTP thất bại';
      if (msg.includes('attempts_left')) {
        const left = msg.split('_')[3];
        setAttemptsLeft(Number(left) || 0);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu không trùng khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithOtp({
        temp_token: tempToken,
        password,
        full_name: fullName,
      });
      login(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBack = () => {
    if (step === STEPS.OTP) {
      setStep(STEPS.EMAIL);
      setError('');
    } else if (step === STEPS.PASSWORD) {
      setStep(STEPS.OTP);
      setError('');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Đăng ký tài khoản</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {step === STEPS.EMAIL && (
          <form onSubmit={handleRequestOtp} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label htmlFor="email-input">Email</label>
              <input
                id="email-input"
                type="email"
                placeholder="your-email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tiếp tục'}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '12px' }}>
              Mã OTP đã gửi tới <strong>{email}</strong> (có hiệu lực 15 phút)
            </div>

            <div className="form-group">
              <label htmlFor="otp-input">Mã OTP</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                disabled={loading}
                maxLength="6"
                required
              />
            </div>

            {attemptsLeft < 5 && (
              <div style={{ fontSize: '12px', color: 'var(--warn)', marginTop: '8px' }}>
                Còn {attemptsLeft} lần nhập
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang xác minh...' : 'Xác minh OTP'}
            </button>

            <button
              type="button"
              className="link-btn"
              onClick={handleBack}
              style={{ marginTop: '12px', display: 'block' }}
            >
              ← Quay lại
            </button>
          </form>
        )}

        {step === STEPS.PASSWORD && (
          <form onSubmit={handleRegister} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '12px' }}>
              Tạo mật khẩu cho tài khoản <strong>{email}</strong>
            </div>

            <div className="form-group">
              <label htmlFor="name-input">Họ và tên</label>
              <input
                id="name-input"
                type="text"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-input">Mật khẩu</label>
              <input
                id="password-input"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password-input">Xác nhận mật khẩu</label>
              <input
                id="confirm-password-input"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>

            <button
              type="button"
              className="link-btn"
              onClick={handleBack}
              style={{ marginTop: '12px', display: 'block' }}
            >
              ← Quay lại
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ textAlign: 'center', marginBottom: '16px', fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>HOẶC TIẾP TỤC VỚI</p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 16px',
              border: '1px solid #dadce0',
              borderRadius: 'var(--radius)',
              background: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontWeight: 500,
              fontSize: '14px',
              color: '#3c4043',
              transition: 'all 0.2s',
              boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#c6c6c6';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#dadce0';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Đăng ký với Google</span>
          </button>
        </div>

        <div className="auth-footer">
          <p>Đã có tài khoản? <button className="link-btn" onClick={onSwitchToLogin}>Đăng nhập</button></p>
        </div>
      </div>
    </div>
  );
}
