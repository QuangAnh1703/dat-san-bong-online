import React, { useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { User, Building2, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';

export const AuthModal = ({ onClose }) => {
  const { login, registerWithPhone, requestEmailOtp, registerWithEmail, showToast } = useApp();

  const [mode, setMode] = useState('login');
  const [method, setMethod] = useState('phone');
  const [selectedRole, setSelectedRole] = useState('PLAYER');

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEmailRegister = mode === 'register' && method === 'email';

  const switchMode = (next) => {
    setMode(next);
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setSendingOtp(true);
    try {
      await requestEmailOtp(identifier);
      setOtpSent(true);
      showToast('Đã gửi mã OTP tới email của bạn.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (isEmailRegister && !otpSent) {
      setError('Vui lòng bấm "Gửi mã" để nhận OTP qua email.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(identifier, password);
        showToast('Đăng nhập thành công!');
      } else if (method === 'email') {
        await registerWithEmail({ email: identifier, otp, password, name, role: selectedRole });
        showToast('Đăng ký tài khoản mới thành công!');
      } else {
        await registerWithPhone({ phone: identifier, password, name, role: selectedRole });
        showToast('Đăng ký tài khoản mới thành công!');
      }
      setPassword('');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      {/* Brand header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-inner">
            SB
          </div>
          <span className="text-2xl font-black text-white font-display">
            SanBong<span className="text-emerald-400">.vn</span>
          </span>
        </div>
        <p className="text-xs text-slate-400">Hệ thống tài khoản và phân quyền trực tuyến</p>
      </div>

      {/* Tab Switch: Login vs Register */}
      <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`py-2 rounded-lg transition-colors cursor-pointer ${
            mode === 'login' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => switchMode('register')}
          className={`py-2 rounded-lg transition-colors cursor-pointer ${
            mode === 'register' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          Đăng ký tài khoản
        </button>
      </div>

      {/* Role Selector (chỉ khi đăng ký; vai trò khi đăng nhập lấy theo tài khoản) */}
      {mode === 'register' && (
        <div className="mb-4">
          <label className="text-[0.8125rem] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Chọn vai trò tài khoản:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('PLAYER')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                selectedRole === 'PLAYER'
                  ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <User className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
              <div className="text-[0.8125rem]">Người chơi</div>
              <div className="text-[0.6875rem] text-slate-500">Đội bóng</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('OWNER')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                selectedRole === 'OWNER'
                  ? 'bg-amber-950 border-amber-500 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <div className="text-[0.8125rem]">Chủ sân</div>
              <div className="text-[0.6875rem] text-slate-500">Quản lý lịch</div>
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {mode === 'register' && (
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Họ và tên của bạn:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        )}

        {mode === 'register' && (
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 font-semibold">
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                method === 'phone' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Số điện thoại
            </button>
            <button
              type="button"
              onClick={() => switchMethod('email')}
              className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                method === 'email' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gmail
            </button>
          </div>
        )}

        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            {mode === 'login' ? 'Email hoặc Số điện thoại:' : method === 'email' ? 'Email:' : 'Số điện thoại:'}
          </label>
          <div className="flex gap-2">
            <input
              type={mode === 'login' ? 'text' : method === 'email' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (otpSent) setOtpSent(false);
              }}
              placeholder={
                mode === 'login'
                  ? '0988xxxxxx hoặc email@domain.com'
                  : method === 'email'
                    ? 'ban@gmail.com'
                    : '0988xxxxxx'
              }
              autoComplete={isEmailRegister ? 'email' : 'username'}
              className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 focus:outline-none"
              required
            />
            {isEmailRegister && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="shrink-0 h-10 px-3 rounded-xl border border-emerald-700 text-emerald-400 hover:bg-emerald-950 disabled:opacity-60 disabled:cursor-wait font-semibold cursor-pointer"
              >
                {sendingOtp ? 'Đang gửi...' : otpSent ? 'Gửi lại' : 'Gửi mã'}
              </button>
            )}
          </div>
        </div>

        {isEmailRegister && otpSent && (
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Mã OTP (6 số, gửi qua email):</label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              pattern="\d{6}"
              className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white tracking-widest focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
        )}

        <div>
          <label className="text-slate-300 font-semibold block mb-1">Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 6 : undefined}
            className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white font-extrabold text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer active:scale-98 mt-2"
        >
          {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập vào hệ thống' : 'Đăng ký tài khoản ngay'}
        </button>
      </form>
    </Modal>
  );
};
