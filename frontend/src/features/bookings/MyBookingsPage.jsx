import { useState, useEffect } from 'react';
import { vnd } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';
import { getMyBookings, rateBooking, cancelBooking } from '../../services/bookings';

/** WF-06 - Quan ly lich da dat & danh gia */
export default function MyBookingsPage() {
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingModal, setRatingModal] = useState({ show: false, bookingId: null, rating: 5 });

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

  async function handleRate(bookingId, rating) {
    try {
      await rateBooking(bookingId, { rating, comment: '' });
      setRatingModal({ show: false, bookingId: null, rating: 5 });
      loadBookings();
    } catch (err) {
      console.error('Error rating booking:', err);
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
        {error && (
          <div style={{
            padding: '12px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
            Đang tải...
          </div>
        )}

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
                            {booking.created_at ? new Date(booking.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Giá:</span>
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
                          <button className="btn-small" onClick={() => alert('Chi tiết: ' + booking.code)}>
                            Chi tiết
                          </button>
                          <button
                            className="btn-small"
                            style={{ background: '#dc3545', color: 'white' }}
                            onClick={() => handleCancel(booking.code)}
                          >
                            Hủy lịch
                          </button>
                        </>
                      )}
                      {bookedStatus === 'completed' && (
                        <>
                          <button
                            className="btn-small"
                            onClick={() => setRatingModal({ show: true, bookingId: booking.code, rating: 5 })}
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

        {/* Rating Modal */}
        {ratingModal.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center',
            }}>
              <h3>Đánh giá lịch đặt</h3>
              <div style={{ margin: '20px 0', fontSize: '32px', letterSpacing: '8px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setRatingModal({ ...ratingModal, rating: i + 1 })}
                    style={{
                      cursor: 'pointer',
                      color: i < ratingModal.rating ? '#ffc107' : '#ddd',
                      textShadow: i < ratingModal.rating ? '0 0 2px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setRatingModal({ show: false, bookingId: null, rating: 5 })}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    background: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleRate(ratingModal.bookingId, ratingModal.rating)}
                  style={{
                    padding: '10px',
                    border: 'none',
                    background: '#0066cc',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
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
