import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PLAYER_NAV = [
  { to: '/', label: 'Tim san', end: true },
  { to: '/giao-huu', label: 'Giao luu & Ghep doi' },
  { to: '/lich-cua-toi', label: 'Lich cua toi' },
];

const OWNER_NAV = [
  { to: '/', label: 'Trang chu', end: true },
  { to: '/chu-san', label: 'Quan ly san' },
  { to: '/chu-san/doanh-thu', label: 'Doanh thu' },
];

export default function Header() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
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
              <button className="btn-ghost" type="button" onClick={() => navigate('/auth/register')}>
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
              <button className="avatar" type="button" onClick={() => navigate('/auth/login')} title="Dang nhap">
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
            {(user?.role === 'OWNER' ? OWNER_NAV : PLAYER_NAV).map((item) => (
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

    </>
  );
}
