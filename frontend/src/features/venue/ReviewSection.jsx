import { useState } from 'react';

export default function ReviewSection({ venueId }) {
  const [reviews] = useState([
    {
      id: 1,
      author: 'Tran Van A',
      rating: 5,
      text: 'San dep, sach se, co den. Nhan vien than thien. Se quay lai',
      date: '2024-09-20',
    },
    {
      id: 2,
      author: 'Nguyen Thi B',
      rating: 4,
      text: 'Gia co 1 chut cao nhung chat luong van OK. Dat lich de',
      date: '2024-09-18',
    },
    {
      id: 3,
      author: 'Pham Van C',
      rating: 5,
      text: 'Tuyet voi! San chinh, sach se, co wifi, cang tin. Strongly recommend',
      date: '2024-09-15',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submit review:', { rating, text });
    setText('');
    setRating(5);
    setShowForm(false);
  };

  return (
    <div className="review-section">
      <h2>Danh gia ({reviews.length})</h2>

      {/* Rating summary */}
      <div className="rating-summary">
        <div className="rating-score">
          <div className="score">{avgRating}</div>
          <div className="stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`star ${i < Math.round(avgRating) ? 'is-filled' : ''}`}>
                ★
              </span>
            ))}
          </div>
          <div className="count">{reviews.length} danh gia</div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Huy' : '+ Danh gia'}
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Xep hang</label>
            <div className="rating-input">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`star-btn ${i < rating ? 'is-filled' : ''}`}
                  onClick={() => setRating(i + 1)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="review-text">Nhan xet</label>
            <textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Chia se trai nghiem cua ban ve san..."
              rows="4"
            ></textarea>
          </div>

          <button type="submit" className="btn-primary">
            Gui danh gia
          </button>
        </form>
      )}

      {/* Reviews list */}
      <div className="reviews-list">
        {reviews.map((review) => (
          <div className="review-item" key={review.id}>
            <div className="review-header">
              <div className="author-info">
                <div className="avatar-mini">{review.author.charAt(0)}</div>
                <div>
                  <div className="author-name">{review.author}</div>
                  <div className="review-date">{review.date}</div>
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
  );
}
