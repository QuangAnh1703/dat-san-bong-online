import React, { useId } from 'react';

// Logo SanBong.id.vn: mặt sân nhìn từ trên, vòng giữa sân là đồng hồ (giờ trống theo thời gian thực).
// Bản file tĩnh nằm ở public/logo.svg; favicon dùng bản rút gọn public/favicon.svg.
export const LogoMark = ({ className = 'w-9 h-9' }) => {
  // Mỗi lần dùng một id gradient riêng, tránh trùng khi có nhiều logo trên cùng trang
  const gradientId = useId();
  const ink = '#0b130e';
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="SanBong.id.vn">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${gradientId})`} />
      <rect x="12" y="15" width="40" height="34" rx="4" fill="none" stroke={ink} strokeWidth="3" />
      <line x1="32" y1="15" x2="32" y2="49" stroke={ink} strokeWidth="3" />
      <circle cx="32" cy="32" r="9.5" fill="#34d399" stroke={ink} strokeWidth="3" />
      <path d="M32 26.2V32h4.8" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 26.5h4.5v11H12" fill="none" stroke={ink} strokeWidth="3" />
      <path d="M52 26.5h-4.5v11H52" fill="none" stroke={ink} strokeWidth="3" />
    </svg>
  );
};
