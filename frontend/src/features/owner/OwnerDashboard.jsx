import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './OwnerDashboard.module.css';

export function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalVenues: 0,
    activeVenues: 0,
    totalRevenue: 0,
    totalBookings: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch owner stats from API
    // For now, show demo data
    setStats({
      totalVenues: 3,
      activeVenues: 2,
      totalRevenue: 45500000,
      totalBookings: 156,
      pendingApprovals: 2,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return <div className={styles.container}>Đang tải...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Dashboard Chủ Sân</h1>
        <p>Quản lý sân bóng của bạn</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏟️</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tổng sân</p>
            <p className={styles.statValue}>{stats.totalVenues}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Sân hoạt động</p>
            <p className={styles.statValue}>{stats.activeVenues}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Doanh thu (tháng)</p>
            <p className={styles.statValue}>
              {(stats.totalRevenue / 1000000).toFixed(1)}M đ
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tổng đặt sân</p>
            <p className={styles.statValue}>{stats.totalBookings}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2>Hành động nhanh</h2>
        <div className={styles.actionGrid}>
          <button className={styles.actionBtn}>
            <span className={styles.actionIcon}>➕</span>
            <span>Thêm sân mới</span>
          </button>
          <button className={styles.actionBtn}>
            <span className={styles.actionIcon}>⚙️</span>
            <span>Cài đặt giá</span>
          </button>
          <button className={styles.actionBtn}>
            <span className={styles.actionIcon}>📋</span>
            <span>Xem lịch đặt</span>
          </button>
          <button className={styles.actionBtn}>
            <span className={styles.actionIcon}>💾</span>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Pending Approvals */}
      {stats.pendingApprovals > 0 && (
        <div className={styles.section}>
          <div className={styles.pendingAlert}>
            <span className={styles.pendingIcon}>⚠️</span>
            <div>
              <p className={styles.pendingTitle}>Chờ duyệt</p>
              <p className={styles.pendingDesc}>
                Bạn có {stats.pendingApprovals} sân đang chờ admin duyệt
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Venues List */}
      <div className={styles.section}>
        <h2>Sân của bạn</h2>
        <div className={styles.venuesList}>
          <div className={styles.venueItem}>
            <div className={styles.venueName}>Sân Cầu Giấy Center</div>
            <div className={styles.venueStatus}>
              <span className={styles.statusBadge}>✅ Hoạt động</span>
              <span className={styles.venueStats}>5 sân | 120 đặt/tháng</span>
            </div>
          </div>
          <div className={styles.venueItem}>
            <div className={styles.venueName}>Sân Thanh Xuân Sports</div>
            <div className={styles.venueStatus}>
              <span className={styles.statusBadge}>⏳ Chờ duyệt</span>
              <span className={styles.venueStats}>3 sân | Chưa hoạt động</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
