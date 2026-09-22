import { useState } from 'react';
import { register } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import './AuthModal.css';

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mat khau khong trung khop');
      return;
    }

    setLoading(true);
    try {
      const res = await register({ phone, password, fullName });
      login(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Dang ky that bai');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dang ky tai khoan</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="reg-phone">So dien thoai</label>
            <input
              id="reg-phone"
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
            <label htmlFor="reg-name">Ho va ten</label>
            <input
              id="reg-name"
              type="text"
              placeholder="Nhap ho va ten"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Mat khau</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Toi thieu 6 ky tu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm">Xac nhan mat khau</label>
            <input
              id="reg-confirm"
              type="password"
              placeholder="Nhap lai mat khau"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Dang xu ly...' : 'Tao tai khoan'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Co tai khoan roi? <button className="link-btn" onClick={onSwitchToLogin}>Dang nhap</button></p>
        </div>
      </div>
    </div>
  );
}
