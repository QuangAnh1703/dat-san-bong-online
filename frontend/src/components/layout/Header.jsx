import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoginModal } from '../auth/LoginModal';
import { RegisterModal } from '../auth/RegisterModal';

const NAV = [
  { to: '/', label: 'Tim san', end: true },
  { to: '/giao-huu', label: 'Giao luu & Ghep doi' },
  { to: '/lich-cua-toi', label: 'Lich cua toi' },
];

export default function Header() {
  const [navOpen, setNavOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header>
        <div className="wrap hbar">
          <Link className="logo" to="/" onClick={() => setNavOpen(false)}>
            <span className="mark" aria-hidden="true" />
            SanBong<span style={{ color: 'var(--amber)' }}>.</span>vn
          </Link>

          <div className="hact">
            {!user && (
              <button className="btn-ghost" type="button" onClick={() => setLoginOpen(true)}>
                Dang ky san
              </button>
            )}
            {user ? (
              <>
                <Link className="avatar" to="/ho-so" title="Ho so cua toi">
                  {getInitials(user.full_name)}
                </Link>
                <button className="btn-ghost" type="button" onClick={logout}>
                  Dang xuat
                </button>
              </>
            ) : (
              <button className="avatar" type="button" onClick={() => setLoginOpen(true)} title="Dang nhap">
                ?
              </button>
            )}
            <button
              className="navtoggle"
              type="button"
              aria-label={navOpen ? 'Dong menu' : 'Mo menu'}
              aria-expanded={navOpen}
              aria-controls="main-nav"
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>

          <nav className={`main${navOpen ? ' is-open' : ''}`} id="main-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
}
