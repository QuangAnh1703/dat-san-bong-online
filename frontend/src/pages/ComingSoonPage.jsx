import { Link } from 'react-router-dom';

/** Cho cac wireframe chua lam - giu dieu huong khong bi gay khi demo */
export default function ComingSoonPage({ code, title }) {
  return (
    <main className="wrap" style={{ padding: '72px 24px' }}>
      <div className="state">
        <b>{code} · {title}</b>
        Man hinh nay chua duoc lam. Xem danh sach tien do trong README cua du an.
        <div style={{ marginTop: 16 }}>
          <Link className="btn-ghost" style={{ color: 'var(--text)', borderColor: 'var(--line-strong)' }} to="/">
            ← Ve trang chu
          </Link>
        </div>
      </div>
    </main>
  );
}
