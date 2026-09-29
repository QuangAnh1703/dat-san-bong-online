import { useState, useEffect } from 'react';
import { vnd } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';
import { getMyBookings, rateBooking, cancelBooking, getBookingByCode } from '../../services/bookings';
import './MyBookingsPage.css';

/** WF-06 - Quan ly lich da dat & danh gia */
export default function MyBookingsPage() {
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailModal, setDetailModal] = useState({ show: false, booking: null });
  const [ratingModal, setRatingModal] = useState({ show: false, bookingId: null, rating: 5, comment: '' });

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError('');
    try {
      const result = await getMyBookings();
      setBookings(result.data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Không thể tải danh sách đặt sân');
      // Fallback to demo data if API fails
      setBookings([
        {
          code: 'BK001',
          venue_name: 'Sân Cầu Giấy Center',
          total_amount: 250000,
          status: 'CONFIRMED',
          created_at: '2026-09-25',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleShowDetail(bookingCode) {
    try {
      const result = await getBookingByCode(bookingCode);
      setDetailModal({ show: true, booking: result.data || null });
    } catch (err) {
      console.error('Error loading booking detail:', err);
      alert('Không thể tải chi tiết đặt sân');
    }
  }

  async function handleRate(bookingId, rating, comment) {
    try {
      await rateBooking(bookingId, { rating, comment });
      setRatingModal({ show: false, bookingId: null, rating: 5, comment: '' });
      loadBookings();
    } catch (err) {
      console.error('Error rating booking:', err);
      alert('Không thể gửi đánh giá');
    }
  }

  async function handleCancel(bookingCode) {
    if (window.confirm('Bạn chắc chắn muốn hủy đặt sân này?')) {
      try {
        await cancelBooking(bookingCode);
        loadBookings();
      } catch (err) {
        console.error('Error cancelling booking:', err);
        alert('Không thể hủy đặt sân');
      }
    }
  }

  const mapStatus = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('confirmed') || s.includes('in_progress')) return 'confirmed';
    if (s.includes('completed')) return 'completed';
    if (s.includes('cancelled') || s.includes('refunded')) return 'cancelled';
    return 'other';
  };

  const upcoming = bookings.filter((b) => {
    const mapped = mapStatus(b.status);
    return mapped === 'confirmed';
  });
  const completed = bookings.filter((b) => {
    const mapped = mapStatus(b.status);
    return mapped === 'completed';
  });

  const currentBookings = tab === 'upcoming' ? upcoming : completed;

  return (
    <main className="bookings-page">
      <section className="wrap">
        <div className="bookings-header">
          <h1>Lich dat san cua toi</h1>
          <p>Quan ly va danh gia cac lich dat</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Sap toi ({upcoming.length})
          </button>
          <button
            className={`tab ${tab === 'completed' ? 'is-active' : ''}`}
            onClick={() => setTab('completed')}
          >
            Da hoan thanh ({completed.length})
          </button>
        </div>

        {/* Error message */}
        {error && <div className="error-banner">{error}</div>}

        {/* Loading */}
        {loading && <div className="loading-state">Đang tải...</div>}

        {/* Bookings list */}
        {!loading && (
          <div className="bookings-list">
            {currentBookings.length === 0 ? (
              <EmptyState title="Khong co lich dat">
                {tab === 'upcoming'
                  ? 'Ban chua co lich dat sap toi. Hay tim san va dat ngay!'
                  : 'Ban chua co lich dat nao hoan thanh.'}
              </EmptyState>
            ) : (
              currentBookings.map((booking) => {
                const bookedStatus = mapStatus(booking.status);
                return (
                  <div key={booking.code} className="booking-card">
                    <div className="booking-main">
                      <div className="booking-venue">
                        <h3>{booking.venue_name || 'Sân bóng'}</h3>
                        <p className="booking-field">Mã: {booking.code}</p>
                      </div>

                      <div className="booking-details">
                        <div className="detail-row">
                          <span className="label">Ngày:</span>
                          <span className="value">
                            {booking.slots && booking.slots[0]
                              ? new Date(booking.slots[0].play_date).toLocaleDateString('vi-VN')
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Giờ:</span>
                          <span className="value">
                            {booking.slots && booking.slots[0]
                              ? `${booking.slots[0].start_at?.split('T')[1]?.slice(0, 5) || '--:--'} - ${booking.slots[0].end_at?.split('T')[1]?.slice(0, 5) || '--:--'}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Tổng tiền:</span>
                          <span className="value">{vnd(booking.total_amount || 0)}</span>
                        </div>
                      </div>

                      <div className="booking-price">
                        <span className="mono">{vnd(booking.total_amount || 0)}</span>
                      </div>

                      <div className="booking-status">
                        <span className={`status-badge status-${bookedStatus}`}>
                          {bookedStatus === 'confirmed' ? 'Đã xác nhận' : 'Đã hoàn thành'}
                        </span>
                      </div>
                    </div>

                    <div className="booking-actions">
                      {bookedStatus === 'confirmed' && (
                        <>
                          <button className="btn-small" onClick={() => handleShowDetail(booking.code)}>
                            Chi tiết
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleCancel(booking.code)}
                          >
                            Hủy lịch
                          </button>
                        </>
                      )}
                      {bookedStatus === 'completed' && (
                        <>
                          <button
                            className="btn-small btn-primary"
                            onClick={() => setRatingModal({ show: true, bookingId: booking.code, rating: 5, comment: '' })}
                          >
                            Đánh giá
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Detail Modal */}
        {detailModal.show && detailModal.booking && (
          <div className="modal-overlay" onClick={() => setDetailModal({ show: false, booking: null })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Chi tiết đặt sân</h2>
                <button className="modal-close" onClick={() => setDetailModal({ show: false, booking: null })}>
                  ✕
                </button>
              </div>

              {/* Venue info */}
              <div className="detail-section">
                <h3>Sân bóng</h3>
                <div className="detail-item">
                  <span>Tên sân:</span>
                  <strong>{detailModal.booking.venue_name}</strong>
                </div>
                <div className="detail-item">
                  <span>Mã đặt:</span>
                  <strong>{detailModal.booking.code}</strong>
                </div>
              </div>

              {/* Slots info */}
              {detailModal.booking.slots && detailModal.booking.slots.length > 0 && (
                <div className="detail-section">
                  <h3>Chi tiết chơi</h3>
                  {detailModal.booking.slots.map((slot, idx) => (
                    <div key={idx}>
                      <div className="detail-item">
                        <span>Sân/Lô {idx + 1}:</span>
                        <strong>{slot.field_name}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Ngày:</span>
                        <strong>{new Date(slot.play_date).toLocaleDateString('vi-VN')}</strong>
                      </div>
                      <div className="detail-item">
                        <span>Giờ:</span>
                        <strong>
                          {slot.start_at?.split('T')[1]?.slice(0, 5)} - {slot.end_at?.split('T')[1]?.slice(0, 5)}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span>Giá sân:</span>
                        <strong>{vnd(slot.price)}</strong>
                      </div>
                      {idx < detailModal.booking.slots.length - 1 && <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Payment info */}
              <div className="detail-section">
                <h3>Thanh toán</h3>
                <div className="detail-item">
                  <span>Cọc:</span>
                  <strong>{vnd(detailModal.booking.deposit_amount || 0)}</strong>
                </div>
                <div className="detail-item highlight">
                  <span>Tổng tiền:</span>
                  <strong>{vnd(detailModal.booking.total_amount || 0)}</strong>
                </div>
              </div>

              {/* Status */}
              <div className="detail-section">
                <h3>Trạng thái</h3>
                <div className="detail-item">
                  <span>Tình trạng:</span>
                  <span className={`status-badge status-${mapStatus(detailModal.booking.status)}`}>
                    {detailModal.booking.status}
                  </span>
                </div>
              </div>

              <div className="modal-buttons">
                <button className="btn-modal" onClick={() => setDetailModal({ show: false, booking: null })}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModal.show && (
          <div className="modal-overlay" onClick={() => setRatingModal({ show: false, bookingId: null, rating: 5, comment: '' })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Đánh giá lịch đặt</h2>
                <button className="modal-close" onClick={() => setRatingModal({ show: false, bookingId: null, rating: 5, comment: '' })}>
                  ✕
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Mã đặt: {ratingModal.bookingId}</p>
              </div>

              <div className="detail-section">
                <label style={{ display: 'block', textAlign: 'center', marginBottom: '12px', color: '#666' }}>
                  Bạn cảm thấy như thế nào về trải nghiệm này?
                </label>
                <div className="rating-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < ratingModal.rating ? 'filled' : 'empty'}
                      onClick={() => setRatingModal({ ...ratingModal, rating: i + 1 })}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Bình luận (tùy chọn)</label>
                <textarea
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  value={ratingModal.comment}
                  onChange={(e) => setRatingModal({ ...ratingModal, comment: e.target.value })}
                />
              </div>

              <div className="modal-buttons">
                <button
                  className="btn-modal"
                  onClick={() => setRatingModal({ show: false, bookingId: null, rating: 5, comment: '' })}
                >
                  Hủy
                </button>
                <button
                  className="btn-modal primary"
                  onClick={() => handleRate(ratingModal.bookingId, ratingModal.rating, ratingModal.comment)}
                >
                  Gửi đánh giá
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
