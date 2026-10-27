import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning, Loader2, ChevronDown, Send, Clock, ExternalLink } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';

export const TICKET_STATUS = {
  NEW: { text: 'Đã tiếp nhận', cls: 'bg-slate-800 text-slate-300' },
  IN_PROGRESS: { text: 'Đang xử lý', cls: 'bg-cyan-950 text-cyan-300 border border-cyan-800' },
  NEED_INFO: { text: 'Cần bổ sung thông tin', cls: 'bg-amber-950 text-amber-400 border border-amber-800' },
  RESOLVED: { text: 'Đã xử lý', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  CLOSED: { text: 'Đã đóng', cls: 'bg-slate-800 text-slate-400' },
};

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');

const TicketDetail = ({ ticketId, onChanged }) => {
  const { showToast } = useApp();
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const load = () =>
    apiClient.complaints
      .get(ticketId)
      .then(setDetail)
      .catch((err) => showToast(errorMessage(err), 'error'));

  useEffect(() => {
    load();
  }, [ticketId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const url = link.trim();
    if (url && !/^https?:\/\//.test(url)) {
      showToast('Link bằng chứng phải bắt đầu bằng http:// hoặc https://', 'error');
      return;
    }
    setSending(true);
    try {
      await apiClient.complaints.reply(ticketId, { content: text.trim(), ...(url && { evidence_urls: [url] }) });
      setText('');
      setLink('');
      showToast('Đã gửi thông tin bổ sung cho quản trị viên.');
      await load();
      onChanged();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  if (!detail) {
    return (
      <div className="py-6 flex justify-center text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const closed = ['RESOLVED', 'CLOSED'].includes(detail.status);
  return (
    <div className="space-y-3 pt-3 border-t border-slate-800">
      <div className="text-xs text-slate-300 whitespace-pre-wrap">{detail.content}</div>
      {detail.evidence.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detail.evidence.map((ev, i) => (
            <a
              key={ev.id}
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="w-3 h-3" /> Bằng chứng {i + 1}
            </a>
          ))}
        </div>
      )}

      {detail.messages.length > 0 && (
        <div className="space-y-2">
          {detail.messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
                  m.is_mine ? 'bg-emerald-700/70 text-white' : 'bg-slate-800 text-slate-100'
                }`}
              >
                <div className="text-[0.6875rem] font-bold mb-0.5 opacity-80">
                  {m.is_mine ? 'Bạn' : 'Quản trị viên'} · {fmt(m.created_at)}
                </div>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail.resolution && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200">
          <b>Kết quả:</b> {detail.resolution}
        </div>
      )}

      {!closed && (
        <form onSubmit={send} className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              detail.status === 'NEED_INFO'
                ? 'Trả lời yêu cầu bổ sung của quản trị viên...'
                : 'Gửi thêm thông tin cho quản trị viên...'
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link ảnh / bill chuyển khoản (tuỳ chọn)"
              className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Gửi</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const ComplaintsPage = () => {
  const { showToast } = useApp();
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = () =>
    apiClient.complaints
      .getMine()
      .then((res) => {
        const list = res.data || [];
        setItems(list);
        // Mở sẵn khiếu nại đang chờ mình bổ sung
        setOpenId((cur) => cur ?? list.find((t) => t.status === 'NEED_INFO')?.id ?? null);
      })
      .catch((err) => {
        setItems([]);
        showToast(errorMessage(err), 'error');
      });

  useEffect(() => {
    load();
  }, []);

  return (
    <PageLayout
      backTo="/lich-cua-toi"
      backLabel="Về Lịch của tôi"
      icon={MessageSquareWarning}
      eyebrow="Trung tâm khiếu nại"
      title="Khiếu nại của tôi"
      description="Theo dõi tiến độ xử lý và bổ sung thông tin khi quản trị viên yêu cầu."
    >
      {items === null ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="py-14 text-center space-y-2">
          <p className="text-sm font-bold text-white">Bạn chưa gửi khiếu nại nào</p>
          <p className="text-xs text-slate-400">
            Gửi khiếu nại từ một đơn trong{' '}
            <Link to="/lich-cua-toi" className="text-emerald-400 hover:underline">
              Lịch của tôi
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((t) => {
            const st = TICKET_STATUS[t.status] || TICKET_STATUS.NEW;
            const open = openId === t.id;
            return (
              <Card key={t.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  aria-expanded={open}
                  className="w-full text-left flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{t.code}</span>
                      <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                    </div>
                    <div className="text-sm font-bold text-white">{t.subject}</div>
                    <div className="text-xs text-slate-400">
                      Đơn {t.booking_code || '—'} · {t.venue_name || ''} · {fmt(t.created_at)}
                    </div>
                    {t.status === 'NEED_INFO' && (
                      <div className="text-xs text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Hạn bổ sung: {fmt(t.info_due_at)}</span>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && <TicketDetail ticketId={t.id} onChanged={load} />}
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};
