import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, verifyResetOtp, resetPassword } from '../../services/auth';
import styles from './AuthPages.module.css';

const STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password',
};

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(3);
  const [otpResendTime, setOtpResendTime] = useState(0);

  useEffect(() => {
    if (otpResendTime > 0) {
      const timer = setTimeout(() => setOtpResendTime(otpResendTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTime]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await forgotPassword({ email });
      setStep(STEPS.OTP);
      setOtpResendTime(60);
    } catch (err) {
      setError(err.message || 'Yêu cầu OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyResetOtp({ email, otp });
      setTempToken(result.temp_token);
      setStep(STEPS.PASSWORD);
      setOtp('');
    } catch (err) {
      const attempts = otpAttempts - 1;
      setOtpAttempts(attempts);
      if (attempts > 0) {
        setError(`${err.message || 'OTP không đúng'}. Còn ${attempts} lần thử`);
      } else {
        setError('Bạn đã nhập OTP sai quá nhiều lần. Vui lòng thử lại sau.');
        setStep(STEPS.EMAIL);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      await resetPassword({
        temp_token: tempToken,
        password,
      });
      navigate('/auth/login', {
        state: {
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
        }
      });
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpResendTime(60);
    setError('');
    try {
      await forgotPassword({ email });
      setOtpAttempts(3);
    } catch (err) {
      setError(err.message || 'Không thể gửi lại OTP');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Quên mật khẩu?</h1>
          <p>Đặt lại mật khẩu của bạn</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === STEPS.EMAIL && (
          <form onSubmit={handleRequestOtp} className={styles.form}>
            <p className={styles.stepInfo}>Bước 1/3: Xác nhận email</p>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Đang gửi...' : 'Tiếp theo'}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <p className={styles.stepInfo}>Bước 2/3: Xác nhận OTP</p>
            <p className={styles.helpText}>
              Chúng tôi đã gửi mã xác nhận đến <strong>{email}</strong>
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="otp">Mã OTP (6 chữ số)</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.slice(0, 6));
                  setError('');
                }}
                maxLength="6"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>

            <div className={styles.footer}>
              {otpResendTime > 0 ? (
                <p>Gửi lại OTP trong {otpResendTime}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className={styles.link}
                >
                  Gửi lại mã OTP
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep(STEPS.EMAIL);
                  setError('');
                }}
                className={styles.link}
              >
                Thay đổi email
              </button>
            </div>
          </form>
        )}

        {step === STEPS.PASSWORD && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <p className={styles.stepInfo}>Bước 3/3: Tạo mật khẩu mới</p>

            <div className={styles.formGroup}>
              <label htmlFor="password">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <p>
            Nhớ mật khẩu rồi?{' '}
            <Link to="/auth/login" className={styles.link}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
