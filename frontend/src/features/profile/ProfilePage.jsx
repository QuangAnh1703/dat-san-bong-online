import { useState } from 'react';

/** WF-09 - Ho so & diem uy tin */
export default function ProfilePage() {
  const [user] = useState({
    id: 'USR001',
    name: 'Tran Van A',
    email: 'tranvana@example.com',
    phone: '0901 234 567',
    age: 26,
    district: 'Cau Giay',
    bio: 'Nguoi choi bong da, thich giao huu va ro ren',
    avatar: 'T',
  });

  const [reputation] = useState({
    totalBookings: 45,
    completedBookings: 42,
    canceledBookings: 3,
    avgRating: 4.7,
    ratingCount: 38,
    trustScore: 92,
  });

  const [reviews] = useState([
    {
      id: 1,
      author: 'Nguyen Thi B',
      rating: 5,
      text: 'Ban choi gioi, rat vo van',
      date: '2024-09-15',
    },
    {
      id: 2,
      author: 'Pham Van C',
      rating: 5,
      text: 'Than thien, dung gio',
      date: '2024-09-10',
    },
  ]);

  return (
    <main className="profile-page">
      <section className="wrap">
        <div className="profile-header">
          <div className="profile-avatar">{user.avatar}</div>
          <div className="profile-info">
            <h1>{user.name}</h1>
            <div className="profile-meta">
              <span>{user.age} tuoi</span>
              <span className="sep">·</span>
              <span>{user.district}</span>
              <span className="sep">·</span>
              <span>{user.phone}</span>
            </div>
            <p className="profile-bio">{user.bio}</p>
          </div>
          <button className="btn-primary">Sua thong tin</button>
        </div>

        <div className="profile-layout">
          {/* Left - Reputation */}
          <div className="profile-main">
            <div className="reputation-card">
              <h2>Diem uy tin</h2>

              <div className="reputation-score">
                <div className="score-number">{reputation.trustScore}</div>
                <div className="score-bar">
                  <div
                    className="score-fill"
                    style={{ width: `${reputation.trustScore}%` }}
                  ></div>
                </div>
                <div className="score-label">Uy tin cao</div>
              </div>

              <div className="reputation-stats">
                <div className="stat">
                  <span className="label">Tong dat san:</span>
                  <span className="value">{reputation.totalBookings}</span>
                </div>
                <div className="stat">
                  <span className="label">Hoan thanh:</span>
                  <span className="value">{reputation.completedBookings}</span>
                </div>
                <div className="stat">
                  <span className="label">Huy:</span>
                  <span className="value">{reputation.canceledBookings}</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="rating-card">
              <h2>Danh gia</h2>

              <div className="rating-summary">
                <div className="rating-score">
                  <div className="score">{reputation.avgRating}</div>
                  <div className="stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`star ${i < Math.floor(reputation.avgRating) ? 'is-filled' : ''}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="count">{reputation.ratingCount} danh gia</div>
                </div>
              </div>

              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <div className="reviewer">
                        <div className="avatar-mini">{review.author.charAt(0)}</div>
                        <div>
                          <div className="name">{review.author}</div>
                          <div className="date">{review.date}</div>
                        </div>
                      </div>
                      <div className="review-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`star ${i < review.rating ? 'is-filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="review-text">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Account settings */}
          <aside className="profile-sidebar">
            <div className="account-card">
              <h3>Thong tin tai khoan</h3>

              <div className="account-row">
                <span className="label">Dia chi email:</span>
                <span className="value">{user.email}</span>
              </div>

              <div className="account-row">
                <span className="label">Dien thoai:</span>
                <span className="value">{user.phone}</span>
              </div>

              <div className="account-row">
                <span className="label">Quan/Huyen:</span>
                <span className="value">{user.district}</span>
              </div>

              <div className="account-divider"></div>

              <button className="btn-small" style={{ width: '100%' }}>
                Doi mat khau
              </button>

              <button className="btn-small btn-danger" style={{ width: '100%', marginTop: 8 }}>
                Dang xuat
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
