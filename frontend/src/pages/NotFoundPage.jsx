import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="wrap" style={{ padding: '72px 24px' }}>
      <div className="state">
        <b>404 · Khong tim thay trang</b>
        Duong dan ban vua mo khong ton tai.
        <div style={{ marginTop: 16 }}>
          <Link className="btn-ghost" style={{ color: 'var(--text)', borderColor: 'var(--line-strong)' }} to="/">
            ← Ve trang chu
          </Link>
        </div>
      </div>
    </main>
  );
}
