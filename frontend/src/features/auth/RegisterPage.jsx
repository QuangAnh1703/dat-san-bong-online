import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestOtp, verifyOtp, registerWithOtp } from '../../services/auth';
import styles from './AuthPages.module.css';

const STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
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
      await requestOtp({ email });
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
      const result = await verifyOtp({ email, otp });
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

  const handleRegister = async (e) => {
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
      const result = await registerWithOtp({
        temp_token: tempToken,
        password,
        full_name: fullName,
        district_code: districtCode || undefined,
      });
      authLogin(result);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpResendTime(60);
    setError('');
    try {
      await requestOtp({ email });
      setOtpAttempts(3);
    } catch (err) {
      setError(err.message || 'Không thể gửi lại OTP');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Đăng ký</h1>
          <p>Tạo tài khoản SanBong.vn</p>
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
          <form onSubmit={handleRegister} className={styles.form}>
            <p className={styles.stepInfo}>Bước 3/3: Tạo mật khẩu</p>

            <div className={styles.formGroup}>
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Mật khẩu (tối thiểu 6 ký tự)</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
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
              {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất đăng ký'}
            </button>
          </form>
        )}

        {step !== STEPS.EMAIL && (
          <div className={styles.footer}>
            <p>
              Đã có tài khoản?{' '}
              <Link to="/auth/login" className={styles.link}>
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        )}

        {step === STEPS.EMAIL && (
          <div className={styles.footer}>
            <p>
              Đã có tài khoản?{' '}
              <Link to="/auth/login" className={styles.link}>
                Đăng nhập
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
