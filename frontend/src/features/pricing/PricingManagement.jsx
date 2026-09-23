import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPricingRules, createPricingRule, updatePricingRule, deletePricingRule } from '../../services/pricing';
import { useAuth } from '../../contexts/AuthContext';
import Banner from '../../components/ui/Banner';
import PricingForm from './PricingForm';
import PricingList from './PricingList';
import styles from './PricingManagement.module.css';

/** WF-126 - Quản lý bảng giá với cảnh báo chống lặp */
export default function PricingManagement() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadRules();
  }, [venueId]);

  const loadRules = async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const data = await getPricingRules(venueId);
      setRules(data.count > 0 ? data.data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải bảng giá');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra overlap khi user nhập form
  const checkOverlap = (newRule) => {
    const existing = rules.filter(r => r.id !== editingId);
    return existing.filter(r =>
      r.field_type === newRule.field_type &&
      r.day_type === newRule.day_type &&
      !(newRule.to_minute <= r.from_minute || newRule.from_minute >= r.to_minute)
    );
  };

  const handleSubmit = async (formData) => {
    setError('');
    try {
      // Kiểm tra overlap trước khi gửi
      const overlaps = checkOverlap(formData);
      if (overlaps.length > 0) {
        const msg = `Khung giờ ${formData.from_time} - ${formData.to_time} bị chồng lấp với:
${overlaps.map(r => `- ${r.from_time} - ${r.to_time}`).join('\n')}

Vui lòng chỉnh sửa khung giờ.`;
        setError(msg);
        return;
      }

      if (editingId) {
        await updatePricingRule(venueId, editingId, formData);
        setRules(rules.map(r => r.id === editingId ? { ...r, ...formData } : r));
      } else {
        const result = await createPricingRule(venueId, formData);
        setRules([...rules, result]);
      }
      setShowForm(false);
      setEditingId(null);
      setError('');
    } catch (err) {
      // Nếu backend trả về lỗi PRICE_SLOT_OVERLAP
      if (err.code === 'PRICE_SLOT_OVERLAP') {
        setError('❌ ' + err.message);
      } else {
        setError(err.message || 'Lỗi khi lưu bảng giá');
      }
    }
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Xóa bảng giá này?')) return;
    try {
      await deletePricingRule(venueId, ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
    } catch (err) {
      setError(err.message || 'Không thể xóa');
    }
  };

  const editingRule = editingId ? rules.find(r => r.id === editingId) : null;

  return (
    <main>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Bảng giá sân</h1>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              setEditingId(null);
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Đóng' : '+ Thêm khung giờ'}
          </button>
        </div>

        {error && (
          <Banner style={{ whiteSpace: 'pre-line' }}>
            {error}
          </Banner>
        )}

        {showForm && (
          <div className={styles.formSection}>
            <h2>{editingId ? 'Sửa' : 'Thêm'} khung giờ giá</h2>
            <PricingForm
              initialData={editingRule}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              existingRules={rules.filter(r => r.id !== editingId)}
            />
          </div>
        )}

        {loading ? (
          <Banner>Đang tải...</Banner>
        ) : rules.length === 0 ? (
          <Banner>Chưa cấu hình bảng giá</Banner>
        ) : (
          <PricingList
            rules={rules}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  );
}
