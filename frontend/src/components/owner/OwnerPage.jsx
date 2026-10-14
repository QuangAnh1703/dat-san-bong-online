import React from 'react';
import { Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageLayout } from '../ui/PageLayout';

export const BOOKING_STATUS = {
  HELD: { text: 'Giữ chỗ · chưa báo cọc', cls: 'bg-amber-950 text-amber-400 border border-amber-800' },
  PENDING_VERIFY: {
    text: 'Khách báo đã chuyển cọc',
    cls: 'bg-violet-950 text-violet-300 border border-violet-800',
  },
  CONFIRMED: { text: 'Đã xác nhận', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  COMPLETED: { text: 'Đã đá xong', cls: 'bg-slate-800 text-slate-300' },
  CANCELLED_EXPIRED: { text: 'Hết hạn giữ chỗ', cls: 'bg-slate-800 text-slate-400' },
  CANCELLED_BY_USER: { text: 'Khách đã hủy', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  CANCELLED_BY_OWNER: { text: 'Đã từ chối', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  REFUNDED: { text: 'Đã hoàn cọc', cls: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
};

export const TODO_STATUSES = ['HELD', 'PENDING_VERIFY'];

export const statusOf = (status) => BOOKING_STATUS[status] || { text: status, cls: 'bg-slate-800 text-slate-300' };

export const OWNER_INPUT =
  'w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-500';
export const OWNER_PRIMARY_BTN =
  'py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs cursor-pointer transition-colors';
export const OWNER_SECONDARY_BTN =
  'py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors';

// Khung chung cho các trang chủ sân: tiêu đề là ô chọn cụm sân (dùng chung qua AppContext)
export const OwnerPage = ({ icon, eyebrow, description, actions, children }) => {
  const { ownerPitches, managedPitch, setManagedPitchId, pitchesLoading } = useApp();

  if (!managedPitch) {
    return (
      <PageLayout tone="amber" icon={icon} eyebrow={eyebrow} title="Góc Chủ Sân">
        <div className="text-center py-16 px-6 rounded-2xl bg-slate-900 border border-slate-800">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-white">
            {pitchesLoading ? 'Đang tải cụm sân...' : 'Bạn chưa có cụm sân nào đang hoạt động'}
          </h2>
          {!pitchesLoading && (
            <p className="text-xs text-slate-400 mt-1">Cụm sân chỉ hiển thị ở đây sau khi được Admin duyệt.</p>
          )}
        </div>
      </PageLayout>
    );
  }

  const title =
    ownerPitches.length > 1 ? (
      <select
        value={managedPitch.id}
        onChange={(e) => setManagedPitchId(e.target.value)}
        aria-label="Chọn cụm sân"
        className="max-w-full bg-transparent border-b border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
      >
        {ownerPitches.map((p) => (
          <option key={p.id} value={p.id} className="bg-slate-900 text-base">
            {p.name}
          </option>
        ))}
      </select>
    ) : (
      managedPitch.name
    );

  return (
    <PageLayout
      tone="amber"
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description ?? `${managedPitch.address}, ${managedPitch.district}`}
      actions={actions}
    >
      {children}
    </PageLayout>
  );
};
