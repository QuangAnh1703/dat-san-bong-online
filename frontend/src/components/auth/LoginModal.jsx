import { useState } from 'react';
import { login } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import './AuthModal.css';

export function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ phone, password });
      authLogin(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dang nhap</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="login-phone">So dien thoai</label>
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              placeholder="0XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Mat khau</label>
            <input
              id="login-password"
              type="password"
              placeholder="Nhap mat khau"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Dang xu ly...' : 'Dang nhap'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Chua co tai khoan? <button className="link-btn" onClick={onSwitchToRegister}>Dang ky</button></p>
        </div>
      </div>
    </div>
  );
}
