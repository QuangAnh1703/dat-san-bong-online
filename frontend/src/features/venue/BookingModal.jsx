import { useState, useEffect } from 'react';
import { vnd } from '../../lib/format';
import { createBooking } from '../../services/bookings';

export default function BookingModal({ isOpen, onClose, field, venue, onSuccess }) {
  const [formData, setFormData] = useState({
    play_date: new Date().toISOString().split('T')[0],
    start: '19:00',
    end: '20:30',
    user_name: '',
    user_phone: '',
    note: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  // Mock price calculation (in real app, get from API)
  useEffect(() => {
    const hours = calculateHours();
    const estimatedPrice = 250000; // Mock price
    setSummary({
      estimatedPrice,
      deposit: Math.round(estimatedPrice * 0.3),
      hours,
    });
  }, [formData.start, formData.end]);

  function calculateHours() {
    const [startHour, startMin] = formData.start.split(':').map(Number);
    const [endHour, endMin] = formData.end.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    return ((endMins - startMins) / 60).toFixed(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.play_date || !formData.start || !formData.end) {
      setError('Vui lòng chọn đầy đủ ngày và giờ');
      return;
    }

    if (!formData.user_phone || formData.user_phone.length !== 10) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createBooking({
        field_id: field.id,
        play_date: formData.play_date,
        start: formData.start,
        end: formData.end,
        user_id: null, // Will use guest info
        guest_name: formData.user_name || 'Khách',
        guest_phone: formData.user_phone,
        note: formData.note,
      });

      // Success - redirect to payment
      if (result && result.code) {
        onSuccess(result.code);
      }
    } catch (err) {
      setError(err.message || 'Đặt sân thất bại');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
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
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Đặt sân</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Venue & Field Info */}
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>
            {venue?.name}
          </p>
          <h4 style={{ margin: '0 0 8px 0' }}>{field?.name}</h4>
          <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#0066cc' }}>
            Loại: {field?.type}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Ngày đặt
            </label>
            <input
              type="date"
              value={formData.play_date}
              onChange={(e) => setFormData({ ...formData, play_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={formData.end}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Họ tên (tùy chọn)
            </label>
            <input
              type="text"
              value={formData.user_name}
              onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
              placeholder="Nguyễn Văn A"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.user_phone}
              onChange={(e) => setFormData({ ...formData, user_phone: e.target.value })}
              placeholder="0912345678"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Bàn ghi chú gì đó..."
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Summary */}
          {summary && (
            <div style={{
              background: '#f0f8ff',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              borderLeft: '4px solid #0066cc',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Thời lượng</p>
                  <p style={{ margin: '0', fontWeight: 'bold', fontSize: '16px' }}>
                    {summary.hours} giờ
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>Giá ước tính</p>
                  <p style={{ margin: '0', fontWeight: 'bold', fontSize: '16px', color: '#0066cc' }}>
                    {vnd(summary.estimatedPrice)}
                  </p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Tiền cọc (30%):</span>
                  <span style={{ fontWeight: 'bold' }}>{vnd(summary.deposit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 16px',
                border: '1px solid #ddd',
                background: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: '#0066cc',
                color: 'white',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
