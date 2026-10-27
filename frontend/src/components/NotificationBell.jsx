import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { apiClient } from '../services/api';

const POLL_MS = 60 * 1000;

// Mở trang liên quan theo loại thông báo; còn lại gắn với đơn thì mở lịch đặt
const TARGETS = [
  [/^SPLIT_/, null],
  [/^MATCH_RESULT_/, '/lich-cua-toi'],
  [/^TOURNAMENT_/, '/bang-xep-hang?tab=giai-dau'],
  [/^WALLET_FROZEN_ADMIN$/, '/quan-tri/vi-hoi-vien'],
  [/^WALLET_/, '/ho-so'],
  [/^(FREELANCE|INVITE|RECRUIT)_/, '/ghep-chan-le?tab=cua-toi'],
  [/^MATCH_ACCEPTED$/, '/tin-nhan'],
  [/^MATCH_/, '/giao-huu'],
  [/^COMPLAINT_REPLIED$/, '/quan-tri/khieu-nai'],
  [/^COMPLAINT_/, '/khieu-nai'],
  [/^REPUTATION_/, '/ho-so'],
  [/^VENUE_/, '/chu-san/cum-san'],
  [/^BOOKING_PAID$/, '/chu-san/don-dat'],
  [/^REPORT_/, '/quan-tri/bao-cao'],
];
const targetOf = (n) => {
  // Thông báo chia tiền mở thẳng sổ quỹ của trận
  if (/^SPLIT_/.test(n.type) && n.booking_code) return `/chia-tien/${n.booking_code}`;
  return TARGETS.find(([re]) => re.test(n.type))?.[1] || (n.booking_code ? '/lich-cua-toi' : null);
};

const timeAgo = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.notifications.list();
      setItems(res.data || []);
      setUnread(res.unread || 0);
    } catch {
      /* chuông không quan trọng bằng trang đang xem: lỗi thì giữ dữ liệu cũ */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const markAll = async () => {
    await apiClient.notifications.markRead().catch(() => {});
    await load();
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.is_read) {
      await apiClient.notifications.markRead([n.id]).catch(() => {});
      load();
    }
    const to = targetOf(n);
    if (to) navigate(to);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1 min-w-4 text-[0.6875rem] leading-4 font-bold bg-rose-500 text-white rounded-full tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-16 sm:top-auto sm:right-0 sm:mt-2 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
            <span className="text-sm font-bold text-white">Thông báo</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-800">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-slate-400">Chưa có thông báo nào.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-slate-800/70 cursor-pointer ${
                      n.is_read ? '' : 'bg-emerald-950/30'
                    }`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-emerald-400'}`}
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-xs font-bold text-white">{n.title}</span>
                      {n.body && <span className="block text-xs text-slate-400 break-words">{n.body}</span>}
                      <span className="block text-[0.75rem] text-slate-500">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
