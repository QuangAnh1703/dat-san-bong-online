import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, ExternalLink, Clock, Send, Gavel } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';
import { TICKET_STATUS } from './ComplaintsPage';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');
const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const INPUT =
  'w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:border-cyan-500 focus:outline-none';

const PAYMENT_LABEL = { PENDING: 'Chờ đối soát', SUCCESS: 'Thành công', FAILED: 'Thất bại', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn' };

export const AdminComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, reloadAdmin } = useApp();
  const [t, setT] = useState(null);
  const [infoMsg, setInfoMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState({ outcome: 'REFUND', resolution: '', penaltyUser: '', points: 5, lockUser: '' });

  const load = () =>
    apiClient.admin
      .getComplaint(id)
      .then(setT)
      .catch((err) => {
        showToast(errorMessage(err), 'error');
        navigate('/quan-tri/khieu-nai', { replace: true });
      });

  useEffect(() => {
    load();
  }, [id]);

  if (!t) {
    return (
      <PageLayout tone="cyan" icon={AlertTriangle} eyebrow="Quản trị hệ thống" title="Hồ sơ khiếu nại">
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  const open = !['RESOLVED', 'CLOSED'].includes(t.status);
  const st = TICKET_STATUS[t.status] || TICKET_STATUS.NEW;
  const paid = t.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
  const partyLabel = (p) => `${p.full_name || 'Người dùng'} · ${p.relation} · uy tín ${p.reputation_score ?? '—'}`;
  const candidates = t.parties.filter((p) => p.role !== 'ADMIN');

  const requestInfo = async (e) => {
    e.preventDefault();
    if (!infoMsg.trim()) return;
    setBusy(true);
    try {
      await apiClient.admin.requestComplaintInfo(t.id, infoMsg.trim());
      setInfoMsg('');
      showToast('Đã gửi yêu cầu bổ sung, hạn phản hồi 24 giờ.');
      await Promise.all([load(), reloadAdmin().catch(() => undefined)]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (e) => {
    e.preventDefault();
    if (!verdict.resolution.trim()) {
      showToast('Nhập nội dung phán quyết gửi cho người khiếu nại.', 'error');
      return;
    }
    const parts = [verdict.outcome === 'REFUND' ? `hoàn ${vnd(paid)} tiền cọc` : 'không hoàn cọc'];
    if (verdict.penaltyUser) parts.push(`trừ ${verdict.points} điểm uy tín`);
    if (verdict.lockUser) parts.push('khóa tài khoản vi phạm');
    if (!window.confirm(`Xác nhận phán quyết: ${parts.join(', ')}? Không thể hoàn tác.`)) return;
    setBusy(true);
    try {
      await apiClient.admin.resolveComplaint(t.id, verdict.outcome, verdict.resolution.trim(), {
        ...(verdict.penaltyUser && { penalty_user_id: Number(verdict.penaltyUser), penalty_points: Number(verdict.points) }),
        ...(verdict.lockUser && { lock_user_id: Number(verdict.lockUser) }),
      });
      showToast('Đã xử lý và đóng khiếu nại.');
      await Promise.all([load(), reloadAdmin().catch(() => undefined)]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout
      tone="cyan"
      backTo="/quan-tri/khieu-nai"
      backLabel="Về danh sách khiếu nại"
      icon={AlertTriangle}
      eyebrow={`Khiếu nại ${t.code}`}
      title={t.subject}
      description={`Gửi lúc ${fmt(t.created_at)} bởi ${t.reporter?.full_name || 'người dùng'} (${t.reporter?.phone || t.reporter?.email || '—'})`}
      actions={<span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.text}</span>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start text-xs">
        <div className="lg:col-span-2 space-y-5">
          <AdminCard title="Nội dung khiếu nại">
            <p className="text-slate-200 whitespace-pre-wrap">{t.content}</p>
            {t.evidence.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {t.evidence.map((ev, i) => (
                  <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                    <ExternalLink className="w-3 h-3" /> Bằng chứng {i + 1}
                  </a>
                ))}
              </div>
            )}
            {t.resolution && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200">
                <b>Phán quyết:</b> {t.resolution}
              </div>
            )}
          </AdminCard>

          <AdminCard title={`Đơn đặt sân ${t.booking?.code || ''}`}>
            {!t.booking ? (
              <EmptyNote>Khiếu nại không gắn với đơn nào.</EmptyNote>
            ) : (
              <div className="space-y-2 text-slate-300">
                <div>
                  <b className="text-white">{t.booking.venue_name}</b> · {t.booking.venue_address}
                </div>
                <div>
                  Trạng thái: <b className="text-white">{t.booking.status}</b> · Tổng {vnd(t.booking.total_amount)} · Cọc{' '}
                  {vnd(t.booking.deposit_amount)}
                </div>
                {t.booking.cancel_reason && <div>Lý do hủy: {t.booking.cancel_reason}</div>}
                <ul className="space-y-1">
                  {t.booking.slots.map((s, i) => (
                    <li key={i} className="text-slate-400">
                      {new Date(s.play_date).toLocaleDateString('vi-VN')} · {s.start_time}-{s.end_time} · {s.field_name} ·{' '}
                      {vnd(s.price)} · {s.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AdminCard>

          <AdminCard title={`Giao dịch cọc (đã thu ${vnd(paid)})`}>
            {t.payments.length === 0 ? (
              <EmptyNote>Chưa có giao dịch.</EmptyNote>
            ) : (
              <div className="divide-y divide-slate-800">
                {t.payments.map((p) => (
                  <div key={p.id} className="py-2 flex flex-wrap justify-between gap-2">
                    <span className="text-slate-300">
                      {p.method} · <span className="font-mono">{p.provider_ref}</span>
                      {p.bill_image_url && (
                        <a href={p.bill_image_url} target="_blank" rel="noreferrer" className="ml-2 text-cyan-400">
                          bill
                        </a>
                      )}
                    </span>
                    <span className="text-white font-bold">
                      {vnd(p.amount)} · {PAYMENT_LABEL[p.status] || p.status}
                      <span className="text-slate-500 font-normal"> · {fmt(p.paid_at || p.created_at)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Nhật ký chat của trận">
            {t.chat_log.length === 0 ? (
              <EmptyNote>Trận này không có tin nhắn.</EmptyNote>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {t.chat_log.map((m) => (
                  <div key={m.id}>
                    <span className="text-slate-500">{fmt(m.created_at)} · </span>
                    <b className="text-slate-200">{m.sender_name || 'Người dùng'}:</b>{' '}
                    <span className="text-slate-300">{m.content}</span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard title="Trao đổi với người khiếu nại">
            {t.messages.length === 0 ? (
              <EmptyNote>Chưa có trao đổi.</EmptyNote>
            ) : (
              <div className="space-y-2">
                {t.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl ${m.from_reporter ? 'bg-slate-800 text-slate-100' : 'bg-cyan-950/60 text-cyan-100'}`}
                  >
                    <div className="text-[0.6875rem] font-bold opacity-80 mb-0.5">
                      {m.from_reporter ? 'Người khiếu nại' : 'Admin'} · {fmt(m.created_at)}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
              </div>
            )}
            {t.status === 'NEED_INFO' && (
              <div className={`flex items-center gap-1.5 ${t.info_overdue ? 'text-rose-400' : 'text-amber-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {t.info_overdue
                    ? 'Đã quá hạn 24h chưa bổ sung: xử lý theo dữ liệu hiện có hoặc đóng do không đủ căn cứ.'
                    : `Hạn bổ sung: ${fmt(t.info_due_at)}`}
                </span>
              </div>
            )}
            {open && (
              <form onSubmit={requestInfo} className="space-y-2">
                <textarea
                  value={infoMsg}
                  onChange={(e) => setInfoMsg(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Cần bổ sung gì? VD ảnh bill chuyển khoản, ảnh sân lúc đến..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !infoMsg.trim()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Yêu cầu bổ sung thông tin (hạn 24h)</span>
                </button>
              </form>
            )}
          </AdminCard>

          {open && (
            <AdminCard title="Phán quyết" icon={Gavel}>
              <form onSubmit={resolve} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['REFUND', `Hoàn cọc (${vnd(paid)})`],
                    ['REJECT', 'Không hoàn cọc'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={verdict.outcome === value}
                      onClick={() => setVerdict((v) => ({ ...v, outcome: value }))}
                      className={`py-2 px-2 rounded-xl border font-semibold cursor-pointer ${
                        verdict.outcome === value
                          ? 'bg-cyan-600 border-cyan-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Trừ điểm uy tín (tuỳ chọn)</label>
                  <div className="flex gap-2">
                    <select
                      value={verdict.penaltyUser}
                      onChange={(e) => setVerdict((v) => ({ ...v, penaltyUser: e.target.value }))}
                      className={`${INPUT} flex-1 min-w-0 w-auto`}
                    >
                      <option value="">Không trừ</option>
                      {candidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {partyLabel(p)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={verdict.points}
                      disabled={!verdict.penaltyUser}
                      onChange={(e) => setVerdict((v) => ({ ...v, points: e.target.value }))}
                      aria-label="Số điểm trừ"
                      className={`${INPUT} w-20 disabled:opacity-50`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Khóa tài khoản vi phạm (tuỳ chọn)</label>
                  <select
                    value={verdict.lockUser}
                    onChange={(e) => setVerdict((v) => ({ ...v, lockUser: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="">Không khóa</option>
                    {candidates
                      .filter((p) => p.status !== 'LOCKED')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {partyLabel(p)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nội dung phán quyết (gửi người khiếu nại)</label>
                  <textarea
                    value={verdict.resolution}
                    onChange={(e) => setVerdict((v) => ({ ...v, resolution: e.target.value }))}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold cursor-pointer"
                >
                  {busy ? 'Đang xử lý...' : 'Ra phán quyết & đóng khiếu nại'}
                </button>
              </form>
            </AdminCard>
          )}
        </div>
      </div>
    </PageLayout>
  );
};
