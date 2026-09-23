import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Banner from '../../components/ui/Banner';
import { vnd } from '../../lib/format';

/** WF-04 - Xac nhan & thanh toan tien coc */
export default function PaymentPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  // Mock booking data - trong thuc te se lay tu API
  const [booking] = useState({
    id: code,
    venue: {
      name: 'San Cau Giay Center',
      address: 'So 123 Duong Cau Giay, Ha Noi',
      phone: '024 1234 5678',
    },
    field: {
      name: 'San 1 - 5a side',
      type: '5-a-side',
    },
    date: '2024-09-25',
    time: '19:00 - 20:30',
    price: 250000,
    deposit: 125000, // 50%
    total: 250000,
  });

  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, pending, success, failed

  const handlePayment = async () => {
    if (!agreed) {
      alert('Vui long dong y dieu kien dat san');
      return;
    }

    setLoading(true);
    try {
      // Mock payment call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setPaymentStatus('success');
      setTimeout(() => {
        navigate('/lich-cua-toi');
      }, 2000);
    } catch (err) {
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <main className="payment-page">
        <section className="wrap">
          <div className="payment-success">
            <div className="success-icon">✓</div>
            <h1>Thanh toan thanh cong</h1>
            <p>Booking code: <strong className="mono">{booking.id}</strong></p>
            <p>Ban se nhan email xac nhan trong it phut</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/lich-cua-toi')}
            >
              Xem lich cua toi
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <main className="payment-page">
        <section className="wrap">
          <div className="payment-failed">
            <div className="failed-icon">✕</div>
            <h1>Thanh toan that bai</h1>
            <p>Co loi trong qua trinh xu ly thanh toan. Vui long thu lai.</p>
            <button
              className="btn-primary"
              onClick={() => setPaymentStatus(null)}
            >
              Quay lai
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <section className="wrap">
        <div className="payment-header">
          <h1>Thanh toan tien coc</h1>
          <p>Dat san tai {booking.venue.name}</p>
        </div>

        <div className="payment-layout">
          {/* Left - Thong tin dat san */}
          <div className="payment-main">
            {/* Thong tin san */}
            <div className="payment-section">
              <h2>Thong tin dat san</h2>
              <div className="booking-info">
                <div className="info-row">
                  <span className="label">San:</span>
                  <span className="value">{booking.venue.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Dia chi:</span>
                  <span className="value">{booking.venue.address}</span>
                </div>
                <div className="info-row">
                  <span className="label">San con:</span>
                  <span className="value">{booking.field.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Ngay:</span>
                  <span className="value">{booking.date}</span>
                </div>
                <div className="info-row">
                  <span className="label">Gio:</span>
                  <span className="value">{booking.time}</span>
                </div>
              </div>
            </div>

            {/* Phuong thuc thanh toan */}
            <div className="payment-section">
              <h2>Chon phuong thuc thanh toan</h2>
              <div className="payment-methods">
                <label className="payment-method">
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="method-content">
                    <div className="method-name">Chuyen khoan ngan hang</div>
                    <div className="method-desc">Chuyen khoan truc tiep toi tai khoan san</div>
                  </div>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="method-content">
                    <div className="method-name">The tin dung / The ghi no</div>
                    <div className="method-desc">Thanh toan bang the credit/debit</div>
                  </div>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="payment"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="method-content">
                    <div className="method-name">Vi dien tu</div>
                    <div className="method-desc">Momo, Zalopay, v.v</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Terms */}
            <div className="payment-section">
              <label className="checkbox-large">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  Toi dong y voi{' '}
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    dieu kien dat san
                  </a>{' '}
                  va{' '}
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    chinh sach bao mat
                  </a>
                </span>
              </label>
            </div>

            <Banner>
              Tien coc se duoc hoan lai neu ban huy lich dat tren 24 gio truoc gio bac san.
            </Banner>
          </div>

          {/* Right - Thong tin thanh toan */}
          <aside className="payment-sidebar">
            <div className="payment-card">
              <h3>Chi tiet thanh toan</h3>

              <div className="price-row">
                <span>Gia san (90 phut)</span>
                <span className="mono">{vnd(booking.price)}</span>
              </div>

              <div className="price-row">
                <span className="tax-notice">Tien coc (50%)</span>
                <span className="mono">{vnd(booking.deposit)}</span>
              </div>

              <div className="price-divider"></div>

              <div className="price-row total">
                <span>Tong tien coc</span>
                <span className="mono">{vnd(booking.deposit)}</span>
              </div>

              <button
                className="btn-primary"
                onClick={handlePayment}
                disabled={!agreed || loading}
                style={{ width: '100%', marginTop: 16 }}
              >
                {loading ? 'Dang xu ly...' : `Thanh toan ${vnd(booking.deposit)}`}
              </button>

              <div className="payment-footer">
                <p>
                  <strong>Luu y:</strong> Ban can thanh toan tien coc de xac nhan booking.
                  So tien con lai se thanh toan truc tiep cho san.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
