import { useState } from 'react';
import { requestOtp, verifyOtp, registerWithOtp } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import './AuthModal.css';

const STEPS = {
  PHONE: 'phone',
  OTP: 'otp',
  PASSWORD: 'password',
};

export function OtpRegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
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
      await requestOtp({ phone });
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
      const res = await verifyOtp({ phone, otp });
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
      setStep(STEPS.PHONE);
      setError('');
    } else if (step === STEPS.PASSWORD) {
      setStep(STEPS.OTP);
      setError('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Đăng ký tài khoản</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {step === STEPS.PHONE && (
          <form onSubmit={handleRequestOtp} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label htmlFor="otp-reg-phone">Số điện thoại</label>
              <input
                id="otp-reg-phone"
                type="tel"
                inputMode="numeric"
                placeholder="0XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              Mã OTP gửi tới <strong>{phone}</strong> (có hiệu lực 15 phút)
            </div>

            <div className="form-group">
              <label htmlFor="otp-code">Mã OTP</label>
              <input
                id="otp-code"
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
              Tạo mật khẩu cho tài khoản <strong>{phone}</strong>
            </div>

            <div className="form-group">
              <label htmlFor="otp-name">Họ và tên</label>
              <input
                id="otp-name"
                type="text"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="otp-password">Mật khẩu</label>
              <input
                id="otp-password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="otp-confirm">Xác nhận mật khẩu</label>
              <input
                id="otp-confirm"
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

        <div className="auth-footer">
          <p>Có tài khoản rồi? <button className="link-btn" onClick={onSwitchToLogin}>Đăng nhập</button></p>
        </div>
      </div>
    </div>
  );
}
