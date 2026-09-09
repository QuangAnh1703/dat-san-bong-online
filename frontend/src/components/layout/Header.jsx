import { NavLink, Link } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Tim san', end: true },
  { to: '/giao-huu', label: 'Giao luu & Ghep doi' },
  { to: '/lich-cua-toi', label: 'Lich cua toi' },
];

export default function Header() {
  return (
    <header>
      <div className="wrap hbar">
        <Link className="logo" to="/">
          <span className="mark" aria-hidden="true" />
          SanBong<span style={{ color: 'var(--amber)' }}>.</span>vn
        </Link>

        <nav className="main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hact">
          <button className="btn-ghost" type="button">Dang ky san cua ban</button>
          <Link className="avatar" to="/ho-so" title="Ho so cua toi">QA</Link>
        </div>
      </div>
    </header>
  );
}
