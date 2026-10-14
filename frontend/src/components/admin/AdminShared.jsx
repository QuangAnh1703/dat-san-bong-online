import React, { useState } from 'react';
import { errorMessage, useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';

export const EmptyNote = ({ children }) => <div className="py-8 text-center text-xs text-slate-400">{children}</div>;

export const AdminCard = ({ title, icon: Icon, iconCls = 'text-cyan-400', actions, children }) => (
  <section className="bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconCls}`} />}
          <span>{title}</span>
        </h2>
        {actions}
      </div>
    )}
    {children}
  </section>
);

// Chạy một thao tác quản trị: khóa nút đang xử lý, lỗi thì báo toast
export function useAdminRun() {
  const { showToast } = useApp();
  const [busyId, setBusyId] = useState(null);
  const run = async (id, action) => {
    setBusyId(id);
    try {
      await action();
      return true;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };
  return { busyId, run };
}

// Hộp thoại nhập lý do (từ chối, khóa, kết quả xử lý...) thay cho prompt() của trình duyệt
export const ReasonModal = ({ title, description, label, confirmText, danger, onSubmit, onClose }) => {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    const ok = await onSubmit(reason.trim());
    setSending(false);
    if (ok !== false) onClose();
  };

  return (
    <Modal title={title} description={description} tone="cyan" size="sm" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-xs">
        <label className="text-slate-300 font-semibold block">{label}</label>
        <textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-cyan-500 focus:outline-none"
          required
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={sending || !reason.trim()}
            className={`flex-1 py-2.5 rounded-xl disabled:opacity-50 text-white font-bold cursor-pointer ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
            {sending ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
};
