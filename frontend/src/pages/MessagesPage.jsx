import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Send, Loader2, MapPin } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';

const THREAD_POLL_MS = 4000;
const LIST_POLL_MS = 15000;

const matchTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' })
    : '';

const msgTime = (iso) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString('vi-VN', sameDay ? { hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

// Tên nhóm chat = các thành viên khác (ưu tiên tên đội)
const titleOf = (conv, myId) =>
  conv.members
    .filter((m) => String(m.user_id) !== String(myId))
    .map((m) => m.team_name || m.name || 'Người chơi')
    .join(', ') || 'Nhóm chat trận đấu';

const ConversationList = ({ items, activeId, myId }) =>
  items.length === 0 ? (
    <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-2">
      <MessageCircle className="w-10 h-10 mx-auto text-slate-600" />
      <p className="font-semibold text-white text-sm">Chưa có cuộc trò chuyện nào</p>
      <p>Nhóm chat tự mở khi kèo giao hữu được chốt hoặc bạn được nhận vào một trận ghép chân lẻ.</p>
    </div>
  ) : (
    <ul className="divide-y divide-slate-800">
      {items.map((c) => {
        const unread = Number(c.unread) || 0;
        return (
          <li key={c.id}>
            <Link
              to={`/tin-nhan/${c.id}`}
              className={`block px-4 py-3 transition-colors ${
                String(c.id) === String(activeId) ? 'bg-emerald-950/50' : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${unread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
                  {titleOf(c, myId)}
                </span>
                {unread > 0 && (
                  <span className="shrink-0 px-1.5 min-w-5 text-center text-[0.6875rem] leading-5 font-bold bg-emerald-500 text-slate-950 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <div className="text-[0.75rem] text-slate-500 truncate">
                {c.venue_name} · {matchTime(c.starts_at)}
              </div>
              <div className={`text-xs truncate mt-0.5 ${unread ? 'text-slate-200' : 'text-slate-400'}`}>
                {c.last_message
                  ? `${String(c.last_sender_id) === String(myId) ? 'Bạn: ' : ''}${c.last_message}`
                  : 'Chưa có tin nhắn, hãy chào hỏi đối thủ!'}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

const Thread = ({ conv, myId, onSent }) => {
  const { showToast } = useApp();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastIdRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.community.getMessages(conv.id, lastIdRef.current);
      const fresh = res.data || [];
      if (fresh.length) {
        lastIdRef.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...(prev || []), ...fresh]);
      } else {
        setMessages((prev) => prev || []);
      }
    } catch (err) {
      setMessages((prev) => prev || []);
      showToast(errorMessage(err), 'error');
    }
  }, [conv.id]);

  useEffect(() => {
    lastIdRef.current = 0;
    setMessages(null);
    load();
    const t = setInterval(load, THREAD_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await apiClient.community.sendMessage(conv.id, content);
      setText('');
      await load();
      onSent();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-15rem)] min-h-80 lg:h-[36rem]">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-sm font-bold text-white truncate">{titleOf(conv, myId)}</div>
        <div className="text-[0.75rem] text-slate-400 flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {conv.venue_name} · {matchTime(conv.starts_at)} · Mã {conv.booking_code}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages === null ? (
          <div className="py-10 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            Hãy thống nhất áo đấu, giờ có mặt và cách chia tiền sân tại đây.
          </p>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender_id) === String(myId);
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && <span className="text-[0.6875rem] text-slate-500 mb-0.5 px-1">{m.sender_name}</span>}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      mine ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-100 rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[0.6875rem] text-slate-500 mt-0.5 px-1">{msgTime(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Nhập tin nhắn..."
          aria-label="Nội dung tin nhắn"
          className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-700 bg-slate-950 text-sm text-white focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Gửi"
          className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center cursor-pointer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

// /tin-nhan: danh sách nhóm chat; /tin-nhan/:id: một cuộc trò chuyện (desktop hiện cả hai cột)
export const MessagesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, showToast } = useApp();
  const [items, setItems] = useState(null);

  const loadList = useCallback(async () => {
    try {
      const res = await apiClient.community.getConversations();
      setItems(res.data || []);
    } catch (err) {
      setItems((prev) => prev || []);
      showToast(errorMessage(err), 'error');
    }
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [loadList]);

  const active = items?.find((c) => String(c.id) === String(id));

  useEffect(() => {
    if (id && items && !active) navigate('/tin-nhan', { replace: true });
  }, [id, items, active]);

  return (
    <PageLayout
      icon={MessageCircle}
      eyebrow="Giao lưu"
      title="Tin nhắn"
      description="Nhóm chat của các trận đã chốt kèo giao hữu hoặc ghép chân lẻ."
    >
      {items === null ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">
          <Card className={`p-0 sm:p-0 overflow-hidden ${id ? 'hidden lg:block' : ''}`}>
            <ConversationList items={items} activeId={id} myId={user.id} />
          </Card>
          {active ? (
            <Card className="p-0 sm:p-0 overflow-hidden">
              <Link
                to="/tin-nhan"
                className="lg:hidden flex items-center gap-1.5 px-4 pt-3 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tất cả tin nhắn</span>
              </Link>
              <Thread conv={active} myId={user.id} onSent={loadList} />
            </Card>
          ) : (
            items.length > 0 && (
              <Card className="hidden lg:flex items-center justify-center text-xs text-slate-500">
                Chọn một cuộc trò chuyện để xem tin nhắn.
              </Card>
            )
          )}
        </div>
      )}
    </PageLayout>
  );
};
