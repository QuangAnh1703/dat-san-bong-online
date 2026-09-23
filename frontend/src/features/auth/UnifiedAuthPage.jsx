import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { login, requestOtp, verifyOtp, registerWithOtp, forgotPassword, verifyResetOtp, resetPassword } from '../../services/auth';
import styles from './UnifiedAuth.module.css';

const MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
};

const LOGIN_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
};

const REGISTER_STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password',
  PROFILE: 'profile',
};

export function UnifiedAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  // Mode & Type
  const [mode, setMode] = useState(MODES.LOGIN);

  // Detect URL and set mode
  useEffect(() => {
    if (location.pathname.includes('register')) {
      setMode(MODES.REGISTER);
    } else {
      setMode(MODES.LOGIN);
    }
  }, [location.pathname]);
  const [loginType, setLoginType] = useState(LOGIN_TYPES.EMAIL);
  const [registerStep, setRegisterStep] = useState(REGISTER_STEPS.EMAIL);

  // Login form
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+84 ');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [otpResendTime, setOtpResendTime] = useState(0);

  useEffect(() => {
    if (otpResendTime > 0) {
      const timer = setTimeout(() => setOtpResendTime(otpResendTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTime]);

  // === LOGIN HANDLERS ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const credentials = loginType === LOGIN_TYPES.EMAIL
        ? { email, password }
        : { phone_number: phone.replace(/\D/g, ''), password };

      const result = await login(credentials);
      authLogin(result);
      navigate('/');
    } catch (err) {
      setLoginError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoginLoading(false);
    }
  };

  // === REGISTER HANDLERS ===
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    try {
      await requestOtp({ email: regEmail });
      setRegisterStep(REGISTER_STEPS.OTP);
      setOtpResendTime(60);
    } catch (err) {
      setRegError(err.message || 'Yêu cầu OTP thất bại');
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    try {
      const result = await verifyOtp({ email: regEmail, otp });
      setTempToken(result.temp_token);
      setRegisterStep(REGISTER_STEPS.PASSWORD);
    } catch (err) {
      setRegError(err.message || 'OTP không đúng');
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    if (regPassword !== confirmPassword) {
      setRegError('Mật khẩu xác nhận không khớp');
      setRegLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Mật khẩu phải có ít nhất 6 ký tự');
      setRegLoading(false);
      return;
    }

    try {
      const result = await registerWithOtp({
        temp_token: tempToken,
        password: regPassword,
        full_name: fullName,
        district_code: districtCode || undefined,
        role,
      });
      authLogin(result);
      navigate('/onboarding');
    } catch (err) {
      setRegError(err.message || 'Đăng ký thất bại');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setMode(mode === MODES.LOGIN ? MODES.REGISTER : MODES.LOGIN);
    setLoginError('');
    setRegError('');
  };

  return (
    <div className={styles.container}>
      {/* Left: Form */}
      <div className={styles.formSection}>
        {mode === MODES.LOGIN ? (
          // LOGIN FORM
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1>Đăng nhập</h1>
              <p>Vào tài khoản SanBong.vn của bạn</p>
            </div>

            {loginError && <div className={styles.error}>{loginError}</div>}

            {/* Login Type Toggle */}
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.typeBtn} ${loginType === LOGIN_TYPES.EMAIL ? styles.active : ''}`}
                onClick={() => setLoginType(LOGIN_TYPES.EMAIL)}
              >
                ✉️ Email
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${loginType === LOGIN_TYPES.PHONE ? styles.active : ''}`}
                onClick={() => setLoginType(LOGIN_TYPES.PHONE)}
              >
                📱 SĐT
              </button>
            </div>

            <form onSubmit={handleLogin} className={styles.form}>
              {loginType === LOGIN_TYPES.EMAIL ? (
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Mật khẩu</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className={styles.submitBtn}
              >
                {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <div className={styles.divider}>hoặc</div>

            <a href="/api/auth/google" className={styles.googleBtn}>
              <span>🔐</span> Đăng nhập bằng Google
            </a>

            <div className={styles.footer}>
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={handleSwitchMode}
                >
                  Đăng ký ngay
                </button>
              </p>
            </div>
          </div>
        ) : (
          // REGISTER FORM
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1>Đăng ký</h1>
              <p>Tạo tài khoản SanBong.vn</p>
            </div>

            {regError && <div className={styles.error}>{regError}</div>}

            {registerStep === REGISTER_STEPS.EMAIL && (
              <form onSubmit={handleRequestOtp} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    disabled={regLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className={styles.submitBtn}
                >
                  {regLoading ? 'Đang gửi OTP...' : 'Gửi mã OTP'}
                </button>
              </form>
            )}

            {registerStep === REGISTER_STEPS.OTP && (
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <p className={styles.info}>Nhập mã OTP vừa gửi tới {regEmail}</p>

                <div className={styles.formGroup}>
                  <label>Mã OTP</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    disabled={regLoading}
                    maxLength="6"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className={styles.submitBtn}
                >
                  {regLoading ? 'Đang xác minh...' : 'Xác minh OTP'}
                </button>

                <div className={styles.footer}>
                  {otpResendTime > 0 ? (
                    <p>Gửi lại trong {otpResendTime}s</p>
                  ) : (
                    <button
                      type="button"
                      className={styles.switchBtn}
                      onClick={handleRequestOtp}
                      disabled={regLoading}
                    >
                      Gửi lại OTP
                    </button>
                  )}
                </div>
              </form>
            )}

            {registerStep === REGISTER_STEPS.PASSWORD && (
              <form onSubmit={handleRegister} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Họ tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={regLoading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mật khẩu</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    disabled={regLoading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={regLoading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Vai trò</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={regLoading}
                  >
                    <option value="PLAYER">Người chơi</option>
                    <option value="OWNER">Chủ sân</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className={styles.submitBtn}
                >
                  {regLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                </button>
              </form>
            )}

            <div className={styles.footer}>
              <p>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  className={styles.switchBtn}
                  onClick={handleSwitchMode}
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Google OAuth */}
      <div className={styles.oauthSection}>
        <div className={styles.oauthCard}>
          <div className={styles.oauthHeader}>
            <div className={styles.googleLogo}>🔐</div>
            <h2>Đăng nhập nhanh</h2>
            <p>với tài khoản Google</p>
          </div>

          <a href="/api/auth/google" className={styles.oauthBtn}>
            <span>G</span> Google
          </a>

          <div className={styles.oauthFooter}>
            <p>Đăng nhập an toàn với Google</p>
          </div>
        </div>
      </div>
    </div>
  );
}
