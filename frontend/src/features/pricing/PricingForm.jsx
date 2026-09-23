import { useState, useEffect } from 'react';
import styles from './PricingForm.module.css';

const FIELD_TYPES = ['5-a-side', '7-a-side', '11-a-side', 'futsal'];
const DAY_TYPES = ['WEEKDAY', 'WEEKEND', 'HOLIDAY'];

/** PricingForm - Form tạo/sửa khung giờ giá với validation chống lặp */
export default function PricingForm({ initialData, onSubmit, onCancel, existingRules = [] }) {
  const [formData, setFormData] = useState({
    field_type: initialData?.field_type || '',
    day_type: initialData?.day_type || '',
    from_time: initialData?.from_time || '09:00',
    to_time: initialData?.to_time || '10:00',
    base_price: initialData?.base_price || '',
    multiplier: initialData?.multiplier || 1.0,
    label: initialData?.label || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState('');

  // Kiểm tra overlap khi user thay đổi form
  useEffect(() => {
    checkOverlapWarning();
  }, [formData]);

  const checkOverlapWarning = () => {
    if (!formData.field_type || !formData.day_type) return;

    const fromMin = timeToMinutes(formData.from_time);
    const toMin = timeToMinutes(formData.to_time);

    const overlaps = existingRules.filter(r =>
      r.field_type === formData.field_type &&
      r.day_type === formData.day_type &&
      !(toMin <= r.from_minute || fromMin >= r.to_minute)
    );

    if (overlaps.length > 0) {
      const msg = overlaps
        .map(r => `${r.from_time} - ${r.to_time}`)
        .join(', ');
      setOverlapWarning(`⚠️ Chồng lấp với khung giờ: ${msg}`);
    } else {
      setOverlapWarning('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = (name === 'base_price' || name === 'multiplier') ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.field_type) {
      setError('Vui lòng chọn loại sân');
      return false;
    }
    if (!formData.day_type) {
      setError('Vui lòng chọn loại ngày');
      return false;
    }
    if (!formData.base_price || formData.base_price <= 0) {
      setError('Giá cơ sở phải lớn hơn 0');
      return false;
    }
    if (formData.multiplier < 0.1 || formData.multiplier > 5) {
      setError('Hệ số nhân phải từ 0.1 đến 5');
      return false;
    }

    const fromMin = timeToMinutes(formData.from_time);
    const toMin = timeToMinutes(formData.to_time);
    if (fromMin >= toMin) {
      setError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({
        field_type: formData.field_type,
        day_type: formData.day_type,
        from_time: formData.from_time,
        to_time: formData.to_time,
        base_price: formData.base_price,
        multiplier: formData.multiplier || 1.0,
        label: formData.label || null,
      });
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label htmlFor="field_type">Loại sân *</label>
          <select
            id="field_type"
            name="field_type"
            value={formData.field_type}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">-- Chọn --</option>
            {FIELD_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="day_type">Loại ngày *</label>
          <select
            id="day_type"
            name="day_type"
            value={formData.day_type}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">-- Chọn --</option>
            {DAY_TYPES.map(type => (
              <option key={type} value={type}>
                {type === 'WEEKDAY' ? 'Ngày thường' : type === 'WEEKEND' ? 'Cuối tuần' : 'Lễ/Tết'}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="from_time">Giờ bắt đầu *</label>
          <input
            id="from_time"
            type="time"
            name="from_time"
            value={formData.from_time}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="to_time">Giờ kết thúc *</label>
          <input
            id="to_time"
            type="time"
            name="to_time"
            value={formData.to_time}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="base_price">Giá cơ sở (VND/giờ) *</label>
          <input
            id="base_price"
            type="number"
            name="base_price"
            placeholder="0"
            value={formData.base_price}
            onChange={handleChange}
            required
            disabled={loading}
            step="1000"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="multiplier">Hệ số nhân</label>
          <input
            id="multiplier"
            type="number"
            name="multiplier"
            placeholder="1.0"
            value={formData.multiplier}
            onChange={handleChange}
            disabled={loading}
            step="0.1"
            min="0.1"
            max="5"
          />
          <small>Giá cuối = Giá cơ sở × Hệ số (0.1-5)</small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="label">Nhãn (tùy chọn)</label>
          <input
            id="label"
            type="text"
            name="label"
            placeholder="e.g., Giờ vàng, Giờ thấp điểm"
            value={formData.label}
            onChange={handleChange}
            disabled={loading}
            maxLength="50"
          />
        </div>
      </div>

      {overlapWarning && (
        <div className={styles.warning}>
          {overlapWarning}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={loading || !!overlapWarning}
          className={styles.btnPrimary}
        >
          {loading ? 'Đang lưu...' : 'Lưu'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={styles.btnSecondary}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

// Helper: Convert HH:MM to minutes
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
