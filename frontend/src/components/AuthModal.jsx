import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage, needsProfileSetup, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { User, Building2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Modal } from './ui/Modal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^0[35789][0-9]{8}$/;

// Câu báo lỗi lấy đúng theo PRD (flows.md mục 1.1); backend kiểm tra lại cùng quy tắc
function validateNewPassword(password, confirm) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Mật khẩu quá yếu! Vui lòng sử dụng ít nhất 8 ký tự bao gồm cả chữ và số.';
  }
  if (password !== confirm) return 'Mật khẩu xác nhận không trùng khớp!';
  return null;
}

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-slate-700 bg-slate-950 text-base text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none';
const labelCls = 'text-sm text-slate-300 font-semibold block mb-1.5';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
);

export const AuthModal = ({ onClose }) => {
  const {
    login,
    registerWithPhone,
    requestEmailOtp,
    registerWithEmail,
    requestPasswordReset,
    resetPassword,
    showToast,
  } = useApp();
  const navigate = useNavigate();

  // login | register | forgot
  const [mode, setMode] = useState('login');
  const [method, setMethod] = useState('phone');
  const [selectedRole, setSelectedRole] = useState('PLAYER');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEmailRegister = mode === 'register' && method === 'email';
  const needsOtp = isEmailRegister || mode === 'forgot';
  const isNewPassword = mode !== 'login';

  const switchMode = (next) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setOtpSent(false);
    setError(null);
  };

  const switchMethod = (next) => {
    setMethod(next);
    setIdentifier('');
    setOtp('');
    setOtpSent(false);
    setError(null);
  };

  const handleSendOtp = async () => {
    setError(null);
    if (!EMAIL_RE.test(identifier.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setSendingOtp(true);
    try {
      if (mode === 'forgot') await requestPasswordReset(identifier);
      else await requestEmailOtp(identifier);
      setOtpSent(true);
      showToast(
        mode === 'forgot'
          ? 'Nếu email đã đăng ký, mã OTP đã được gửi tới hộp thư.'
          : 'Đã gửi mã OTP tới email của bạn.'
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const afterLogin = (profile) => {
    onClose();
    if (needsProfileSetup(profile)) {
      navigate('/ho-so');
      showToast(
        'Chào mừng bạn! Hãy cập nhật khu vực, trình độ và vị trí sở trường để được gợi ý sân phù hợp.'
      );
    }
  };

  const validate = () => {
    if (mode === 'register' && method === 'phone' && !MOBILE_RE.test(identifier.replace(/\s/g, ''))) {
      return 'Số điện thoại phải bao gồm đúng 10 chữ số (VD: 0912345678).';
    }
    if (needsOtp && !otpSent) return 'Vui lòng bấm "Gửi mã" để nhận OTP qua email.';
    if (isNewPassword) return validateNewPassword(password, confirmPassword);
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = validate();
    setError(invalid);
    if (invalid) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const profile = await login(identifier, password);
        showToast('Đăng nhập thành công!');
        afterLogin(profile);
      } else if (mode === 'forgot') {
        await resetPassword({ email: identifier, otp, password });
        showToast('Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
        switchMode('login');
      } else {
        const profile =
          method === 'email'
            ? await registerWithEmail({ email: identifier, otp, password, name, role: selectedRole })
            : await registerWithPhone({ phone: identifier, password, name, role: selectedRole });
        showToast('Đăng ký tài khoản mới thành công!');
        afterLogin(profile);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const identifierLabel =
    mode === 'login'
      ? 'Email hoặc Số điện thoại:'
      : mode === 'forgot' || method === 'email'
        ? 'Email:'
        : 'Số điện thoại:';
  const identifierType =
    mode === 'login' ? 'text' : mode === 'forgot' || method === 'email' ? 'email' : 'tel';
  const identifierPlaceholder =
    mode === 'login'
      ? '0988xxxxxx hoặc email@domain.com'
      : mode === 'forgot' || method === 'email'
        ? 'ban@gmail.com'
        : '0912345678';

  return (
    <Modal onClose={onClose} size="full">
      <div className="min-h-dvh">
        <div className="min-h-dvh flex items-center justify-center px-4 py-16 sm:px-8">
          <div className="w-full max-w-md text-sm">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base">
                  SB
                </div>
                <span className="text-2xl font-black text-white font-display">
                  SanBong<span className="text-emerald-400">.vn</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
                {mode === 'forgot'
                  ? 'Quên mật khẩu'
                  : mode === 'register'
                    ? 'Tạo tài khoản mới'
                    : 'Chào mừng trở lại'}
              </h1>
              <p className="mt-2 text-base text-slate-400">
                {mode === 'forgot'
                  ? 'Đặt lại mật khẩu qua mã OTP gửi về email.'
                  : mode === 'register'
                    ? 'Đăng ký để đặt sân, cáp kèo và quản lý lịch đá.'
                    : 'Đăng nhập để tiếp tục đặt sân của bạn.'}
              </p>
            </div>

            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 mb-5 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại đăng nhập</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800 text-sm font-semibold">
                {[
                  ['login', 'Đăng nhập'],
                  ['register', 'Đăng ký tài khoản'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchMode(key)}
                    className={`py-2.5 rounded-lg transition-colors cursor-pointer ${
                      mode === key ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Vai trò chỉ chọn khi đăng ký; khi đăng nhập lấy theo tài khoản */}
            {mode === 'register' && (
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Chọn vai trò tài khoản:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('PLAYER')}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === 'PLAYER'
                        ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className="w-5 h-5 mx-auto mb-1.5 text-emerald-400" />
                    <div className="text-sm">Người chơi</div>
                    <div className="text-xs text-slate-500">Đội bóng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('OWNER')}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedRole === 'OWNER'
                        ? 'bg-amber-950 border-amber-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mx-auto mb-1.5 text-amber-400" />
                    <div className="text-sm">Chủ sân</div>
                    <div className="text-xs text-slate-500">Quản lý lịch</div>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-sm">
              {mode === 'register' && (
                <div>
                  <label className={labelCls}>Họ và tên của bạn:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {mode === 'register' && (
                <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 font-semibold">
                  {[
                    ['phone', 'Số điện thoại'],
                    ['email', 'Gmail'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchMethod(key)}
                      className={`py-2 rounded-lg transition-colors cursor-pointer ${
                        method === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className={labelCls}>{identifierLabel}</label>
                <div className="flex gap-2">
                  <input
                    type={identifierType}
                    inputMode={identifierType === 'tel' ? 'numeric' : undefined}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (otpSent) setOtpSent(false);
                    }}
                    placeholder={identifierPlaceholder}
                    autoComplete={needsOtp ? 'email' : 'username'}
                    className={`${inputCls} flex-1 min-w-0`}
                    required
                  />
                  {needsOtp && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="shrink-0 h-12 px-4 rounded-xl border border-emerald-700 text-emerald-400 hover:bg-emerald-950 disabled:opacity-60 disabled:cursor-wait font-semibold cursor-pointer"
                    >
                      {sendingOtp ? 'Đang gửi...' : otpSent ? 'Gửi lại' : 'Gửi mã'}
                    </button>
                  )}
                </div>
              </div>

              {needsOtp && otpSent && (
                <div>
                  <label className={labelCls}>Mã OTP (6 số, gửi qua email):</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className={`${inputCls} tracking-widest`}
                    required
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-slate-300 font-semibold">
                    {mode === 'forgot' ? 'Mật khẩu mới:' : 'Mật khẩu:'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputCls}
                  required
                />
                {isNewPassword && (
                  <p className="mt-1.5 text-xs text-slate-500">Ít nhất 8 ký tự, gồm cả chữ và số.</p>
                )}
              </div>

              {isNewPassword && (
                <div>
                  <label className={labelCls}>Xác nhận mật khẩu:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white font-extrabold text-base shadow-lg shadow-emerald-950 transition-all cursor-pointer active:scale-98 mt-2"
              >
                {submitting
                  ? 'Đang xử lý...'
                  : mode === 'login'
                    ? 'Đăng nhập vào hệ thống'
                    : mode === 'forgot'
                      ? 'Đặt lại mật khẩu'
                      : 'Đăng ký tài khoản ngay'}
              </button>
            </form>

            {mode !== 'forgot' && (
              <>
                <div className="flex items-center gap-3 my-6 text-sm text-slate-500">
                  <span className="h-px flex-1 bg-slate-800" />
                  <span>hoặc</span>
                  <span className="h-px flex-1 bg-slate-800" />
                </div>
                <a
                  href={apiClient.auth.googleLoginUrl()}
                  className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-white text-base font-semibold flex items-center justify-center gap-2.5 transition-colors"
                >
                  <GoogleIcon />
                  <span>Tiếp tục với Google</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
