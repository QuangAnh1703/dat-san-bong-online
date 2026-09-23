import { useState } from 'react';
import { vnd } from '../../lib/format';
import EmptyState from '../../components/ui/EmptyState';

/** WF-06 - Quan ly lich da dat & danh gia */
export default function MyBookingsPage() {
  const [tab, setTab] = useState('upcoming');
  const [bookings] = useState([
    {
      id: 'BK001',
      venue: 'San Cau Giay Center',
      field: 'San 1 - 5a side',
      date: '2024-09-25',
      time: '19:00 - 20:30',
      price: 250000,
      status: 'confirmed',
      rating: null,
    },
    {
      id: 'BK002',
      venue: 'San My Dinh A',
      field: 'San 2 - 7a side',
      date: '2024-09-28',
      time: '17:00 - 18:30',
      price: 200000,
      status: 'confirmed',
      rating: null,
    },
    {
      id: 'BK003',
      venue: 'San Bach Khoa',
      field: 'San 1 - 5a side',
      date: '2024-09-18',
      time: '19:00 - 20:30',
      price: 250000,
      status: 'completed',
      rating: 5,
    },
  ]);

  const upcoming = bookings.filter((b) => b.status === 'confirmed');
  const completed = bookings.filter((b) => b.status === 'completed');

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

        {/* Bookings list */}
        <div className="bookings-list">
          {currentBookings.length === 0 ? (
            <EmptyState title="Khong co lich dat">
              {tab === 'upcoming'
                ? 'Ban chua co lich dat sap toi. Hay tim san va dat ngay!'
                : 'Ban chua co lich dat nao hoan thanh.'}
            </EmptyState>
          ) : (
            currentBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-main">
                  <div className="booking-venue">
                    <h3>{booking.venue}</h3>
                    <p className="booking-field">{booking.field}</p>
                  </div>

                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="label">Ngay:</span>
                      <span className="value">{booking.date}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Gio:</span>
                      <span className="value">{booking.time}</span>
                    </div>
                  </div>

                  <div className="booking-price">
                    <span className="mono">{vnd(booking.price)}</span>
                  </div>

                  <div className="booking-status">
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status === 'confirmed' ? 'Da xac nhan' : 'Da hoan thanh'}
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  {booking.status === 'confirmed' && (
                    <>
                      <button className="btn-small">Chi tiet</button>
                      <button className="btn-small btn-danger">Huy lich</button>
                    </>
                  )}
                  {booking.status === 'completed' && (
                    <>
                      {booking.rating ? (
                        <div className="rating-done">
                          <span className="stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={`star ${i < booking.rating ? 'is-filled' : ''}`}>
                                ★
                              </span>
                            ))}
                          </span>
                        </div>
                      ) : (
                        <button className="btn-small">Danh gia</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
