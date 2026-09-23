import styles from './PricingList.module.css';

const DAY_TYPE_LABELS = {
  WEEKDAY: 'Ngày thường',
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Lễ/Tết',
};

/** PricingList - Danh sách các khung giờ giá */
export default function PricingList({ rules, onEdit, onDelete }) {
  const grouped = groupRules(rules);

  return (
    <div className={styles.container}>
      {Object.entries(grouped).map(([fieldType, days]) => (
        <div key={fieldType} className={styles.fieldSection}>
          <h3>{fieldType}</h3>
          {Object.entries(days).map(([dayType, timeRules]) => (
            <div key={dayType} className={styles.daySection}>
              <h4>{DAY_TYPE_LABELS[dayType]}</h4>
              <div className={styles.rulesGrid}>
                {timeRules.map(rule => (
                  <div key={rule.id} className={styles.card}>
                    <div className={styles.time}>
                      {rule.from_time} - {rule.to_time}
                    </div>
                    <div className={styles.price}>
                      {formatPrice(rule.base_price)}
                      {rule.multiplier !== 1 && (
                        <span className={styles.multiplier}>
                          × {rule.multiplier}
                        </span>
                      )}
                    </div>
                    <div className={styles.final}>
                      <strong>{formatPrice(rule.base_price * rule.multiplier)}</strong>/giờ
                    </div>
                    {rule.label && (
                      <div className={styles.label}>{rule.label}</div>
                    )}
                    <div className={styles.actions}>
                      <button
                        onClick={() => onEdit(rule)}
                        className={styles.btnEdit}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => onDelete(rule.id)}
                        className={styles.btnDelete}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Group rules by field_type then day_type
function groupRules(rules) {
  const grouped = {};
  rules.forEach(rule => {
    if (!grouped[rule.field_type]) grouped[rule.field_type] = {};
    if (!grouped[rule.field_type][rule.day_type]) {
      grouped[rule.field_type][rule.day_type] = [];
    }
    grouped[rule.field_type][rule.day_type].push(rule);
  });

  // Sort by time
  Object.keys(grouped).forEach(fieldType => {
    Object.keys(grouped[fieldType]).forEach(dayType => {
      grouped[fieldType][dayType].sort((a, b) => a.from_minute - b.from_minute);
    });
  });

  return grouped;
}

function formatPrice(price) {
  return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}
