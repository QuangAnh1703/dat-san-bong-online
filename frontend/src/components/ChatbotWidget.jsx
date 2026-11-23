import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bot, Loader2, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { apiClient } from '../services/api';

const MAX_INPUT = 1000;

// Mỗi vai trò một trợ lý: màu nhấn giống prop tone của PageLayout, lời chào và gợi ý theo các trang của vai trò đó
const ROLE_CONFIG = {
  player: {
    title: 'Trợ lý đặt sân',
    subtitle: 'Tìm sân, ca trống & cách dùng web',
    greeting:
      'Chào bạn! Mình là trợ lý của SanBong.id.vn. Mình tìm sân, xem ca còn trống, và giải đáp cách đặt cọc, hủy đơn, ghép kèo, ghép chân lẻ... Bạn cần gì nào?',
    suggestions: ['Tối nay còn sân 7 nào trống?', 'Hủy sân có được hoàn cọc không?', 'Đội thiếu người thì làm sao?'],
    placeholder: 'VD: Tối mai 19h sân 7 ở Mỹ Đình',
    tone: {
      fab: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60',
      bubble: 'bg-emerald-600',
      link: 'text-emerald-400 hover:text-emerald-300',
      dot: 'text-emerald-500',
      iconBox: 'bg-emerald-950 border-emerald-800',
      icon: 'text-emerald-400',
      focus: 'focus:border-emerald-600',
      chip: 'hover:border-emerald-500',
    },
  },
  owner: {
    title: 'Trợ lý chủ sân',
    subtitle: 'Hướng dẫn các trang quản lý sân',
    greeting:
      'Chào bạn! Mình hướng dẫn các thao tác quản lý: cấu hình bảng giá & Flash Sale, khóa sân, check-out đơn, căng-tin, gói thành viên, giải đấu.',
    suggestions: ['Cách bật Flash Sale giờ chót', 'Khóa sân cho khách gọi điện', 'Cụm sân bị từ chối thì sửa ở đâu?'],
    placeholder: 'VD: Làm sao nhập tỷ số trận cáp kèo?',
    tone: {
      fab: 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/60',
      bubble: 'bg-amber-600',
      link: 'text-amber-400 hover:text-amber-300',
      dot: 'text-amber-500',
      iconBox: 'bg-amber-950 border-amber-800',
      icon: 'text-amber-400',
      focus: 'focus:border-amber-600',
      chip: 'hover:border-amber-500',
    },
  },
  admin: {
    title: 'Trợ lý quản trị',
    subtitle: 'Hướng dẫn các trang quản trị',
    greeting: 'Chào bạn! Mình hướng dẫn quy trình duyệt chủ sân / cụm sân, xử lý khiếu nại, báo cáo và kho tri thức.',
    suggestions: ['Quy trình xử lý khiếu nại', 'Khóa chủ sân đang có đơn thì sao?', 'Thêm bài cho kho tri thức'],
    placeholder: 'Hỏi về thao tác quản trị...',
    tone: {
      fab: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/60',
      bubble: 'bg-cyan-600',
      link: 'text-cyan-400 hover:text-cyan-300',
      dot: 'text-cyan-500',
      iconBox: 'bg-cyan-950 border-cyan-800',
      icon: 'text-cyan-400',
      focus: 'focus:border-cyan-600',
      chip: 'hover:border-cyan-500',
    },
  },
};

const storageKey = (role) => `sanbong_chatbot_${role}`;

const loadHistory = (role, greeting) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(role)));
    return Array.isArray(saved) && saved.length ? saved : [greeting];
  } catch {
    return [greeting];
  }
};

// Chỉ hiển thị **đậm** và [nhãn](/đường-dẫn-nội-bộ); link ngoài hiện thành chữ thường để bot không dẫn ra trang lạ
function renderInline(text, ctx, keyPrefix) {
  const parts = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${m.index}`;
    if (m[3]) {
      parts.push(
        <strong key={key} className="font-bold text-white">
          {m[3]}
        </strong>
      );
    } else if (m[2].startsWith('/') && !m[2].startsWith('//')) {
      parts.push(
        <Link
          key={key}
          to={m[2]}
          onClick={ctx.onNavigate}
          className={`font-bold underline underline-offset-2 ${ctx.tone.link}`}
        >
          {m[1]}
        </Link>
      );
    } else {
      parts.push(m[1]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const MessageText = ({ content, ctx }) => (
  <div className="space-y-1">
    {content.split('\n').map((line, i) => {
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      if (!line.trim()) return <div key={i} className="h-1" />;
      return bullet ? (
        <div key={i} className="flex gap-1.5">
          <span className={ctx.tone.dot}>•</span>
          <span className="min-w-0">{renderInline(bullet[1], ctx, i)}</span>
        </div>
      ) : (
        <p key={i}>{renderInline(line.replace(/^#+\s*/, ''), ctx, i)}</p>
      );
    })}
  </div>
);

// Bài trong kho tri thức mà câu trả lời dựa vào (RAG)
const Sources = ({ sources, ctx }) => (
  <div className="mt-2 pt-2 border-t border-slate-700/60">
    <div className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-slate-500 mb-1">
      <BookOpen className="w-3 h-3" />
      Nguồn tham khảo
    </div>
    <div className="flex flex-wrap gap-1.5">
      {sources.map((s) =>
        s.route ? (
          <Link
            key={s.slug}
            to={s.route}
            onClick={ctx.onNavigate}
            className={`px-2 py-0.5 rounded-md bg-slate-900/70 border border-slate-700 text-[0.7rem] text-slate-300 ${ctx.tone.chip}`}
          >
            {s.title}
          </Link>
        ) : (
          <span
            key={s.slug}
            className="px-2 py-0.5 rounded-md bg-slate-900/70 border border-slate-700 text-[0.7rem] text-slate-400"
          >
            {s.title}
          </span>
        )
      )}
    </div>
  </div>
);

export const ChatbotWidget = ({ role = 'player' }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.player;
  const greeting = { role: 'assistant', content: config.greeting };
  const { tone } = config;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(role, greeting));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(role), JSON.stringify(messages.slice(-30)));
    } catch {
      /* private mode: chỉ giữ trong bộ nhớ */
    }
  }, [messages, role]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text) => {
    const content = text.trim().slice(0, MAX_INPUT);
    if (!content || sending) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError(null);
    setSending(true);
    try {
      // Bỏ lời chào mặc định (không phải câu trả lời thật của model) và nguồn (server không cần)
      const history = next
        .filter((m) => m.content !== config.greeting)
        .map(({ role: r, content: c }) => ({ role: r, content: c }));
      const res = await apiClient.chatbot.send(history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, sources: res.sources || [] }]);
    } catch (err) {
      setError(err.message || 'Trợ lý đang bận, vui lòng thử lại sau');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([greeting]);
    setError(null);
  };

  // Trên mobile panel che kín trang: đóng lại để người dùng thấy trang vừa mở
  const closeOnMobile = () => {
    if (window.matchMedia('(max-width: 639px)').matches) setOpen(false);
  };
  const ctx = { tone, onNavigate: closeOnMobile };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Mở ${config.title.toLowerCase()}`}
        className={`fixed right-4 bottom-20 lg:bottom-6 z-40 flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full text-white font-bold text-xs shadow-xl transition-colors cursor-pointer ${tone.fab}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">{config.title}</span>
      </button>
    );
  }

  const showSuggestions = messages.length === 1 && !sending;

  return (
    <section
      role="dialog"
      aria-label={config.title}
      className="fixed z-50 inset-x-0 bottom-0 h-[85dvh] sm:inset-x-auto sm:right-4 sm:bottom-20 lg:bottom-6 sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100dvh-7rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl text-xs animate-in slide-in-from-bottom-3 duration-200"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${tone.iconBox}`}>
          <Bot className={`w-5 h-5 ${tone.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm text-white">{config.title}</h2>
          <p className="text-[0.7rem] text-slate-400">{config.subtitle}</p>
        </div>
        <button
          onClick={reset}
          aria-label="Bắt đầu cuộc trò chuyện mới"
          title="Trò chuyện mới"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setOpen(false)}
          aria-label="Đóng trợ lý"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed break-words ${
                m.role === 'user'
                  ? `${tone.bubble} text-white rounded-br-md whitespace-pre-wrap`
                  : 'bg-slate-800/80 text-slate-200 rounded-bl-md'
              }`}
            >
              {m.role === 'user' ? m.content : <MessageText content={m.content} ctx={ctx} />}
              {m.sources?.length > 0 && <Sources sources={m.sources} ctx={ctx} />}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tra cứu...</span>
          </div>
        )}
        {error && (
          <div className="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-300">{error}</div>
        )}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {config.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className={`px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:text-white cursor-pointer ${tone.chip}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 p-3 border-t border-slate-800 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={MAX_INPUT}
          placeholder={config.placeholder}
          className={`flex-1 resize-none max-h-24 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none ${tone.focus}`}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Gửi"
          className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer ${tone.fab}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
};
