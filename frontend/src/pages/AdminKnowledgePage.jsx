import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';
import { AdminCard, EmptyNote } from '../components/admin/AdminShared';

const CATEGORIES = {
  BOOKING: 'Đặt sân',
  PAYMENT: 'Thanh toán',
  POLICY: 'Chính sách',
  COMMUNITY: 'Cộng đồng',
  ACCOUNT: 'Tài khoản',
  OWNER: 'Chủ sân',
  ADMIN: 'Quản trị',
  GENERAL: 'Chung',
};
const AUDIENCES = { GUEST: 'Khách', PLAYER: 'Người chơi', OWNER: 'Chủ sân', ADMIN: 'Admin' };
const PAGE_SIZE = 20;

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-600';
const EMPTY = {
  slug: '',
  title: '',
  category: 'BOOKING',
  audience: ['GUEST', 'PLAYER'],
  route: '',
  keywords: '',
  content: '',
  is_active: true,
};

const Badge = ({ children, cls = 'bg-slate-800 text-slate-300' }) => (
  <span className={`px-2 py-0.5 rounded-md text-[0.7rem] font-semibold ${cls}`}>{children}</span>
);

// Ô thử truy xuất: xem trợ lý sẽ lấy được bài nào cho một câu hỏi, theo từng vai trò
const RetrievalTester = () => {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const test = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await apiClient.admin.knowledge.search(q.trim(), role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminCard title="Thử truy xuất" icon={Sparkles}>
      <form onSubmit={test} className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập câu hỏi như người dùng, VD: hủy sân có được hoàn cọc không"
          className={inputCls}
        />
        <div className="flex gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} sm:w-36`}>
            {Object.entries(AUDIENCES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            disabled={loading || !q.trim()}
            className="px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Thử
          </button>
        </div>
      </form>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {result &&
        (result.count === 0 ? (
          <EmptyNote>Không có bài nào đủ liên quan. Trợ lý sẽ trả lời là chưa có thông tin.</EmptyNote>
        ) : (
          <ol className="space-y-2">
            {result.data.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-cyan-400 font-bold text-xs w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{a.title}</div>
                  <div className="text-xs text-slate-400 line-clamp-2">{a.content}</div>
                </div>
                <Badge cls="bg-cyan-950 text-cyan-300">{a.score.toFixed(2)}</Badge>
              </li>
            ))}
          </ol>
        ))}
    </AdminCard>
  );
};

const ArticleForm = ({ initial, onClose, onSaved }) => {
  const { showToast } = useApp();
  const [form, setForm] = useState({ ...EMPTY, ...initial, route: initial?.route || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleAudience = (a) =>
    setForm((f) => ({
      ...f,
      audience: f.audience.includes(a) ? f.audience.filter((x) => x !== a) : [...f.audience, a],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, route: form.route.trim() || null };
      if (initial?.id) await apiClient.admin.knowledge.update(initial.id, body);
      else await apiClient.admin.knowledge.create(body);
      showToast(initial?.id ? 'Đã cập nhật bài viết' : 'Đã thêm bài viết');
      onSaved();
    } catch (err) {
      const reason = err.details?.reason;
      setError(
        err.details?.constraint === 'uq_kb_article_slug'
          ? 'Slug đã tồn tại, hãy chọn slug khác'
          : `${errorMessage(err)}${reason ? `: ${err.details.field} - ${reason}` : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial?.id ? 'Sửa bài viết' : 'Thêm bài viết'}
      description="Mỗi bài nói về một chủ đề, nội dung ngắn gọn để trợ lý trích dẫn chính xác."
      icon={BookOpen}
      tone="cyan"
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="font-semibold text-slate-300">Tiêu đề</span>
            <input required maxLength={200} value={form.title} onChange={set('title')} className={inputCls} />
          </label>
          <label className="space-y-1.5">
            <span className="font-semibold text-slate-300">Slug (không dấu, gạch ngang)</span>
            <input
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={set('slug')}
              placeholder="vd: huy-don-hoan-coc"
              className={inputCls}
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-semibold text-slate-300">Nhóm</span>
            <select value={form.category} onChange={set('category')} className={inputCls}>
              {Object.entries(CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="font-semibold text-slate-300">Trang liên quan (tùy chọn)</span>
            <input
              value={form.route}
              onChange={set('route')}
              placeholder="vd: /lich-cua-toi"
              className={inputCls}
            />
          </label>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="font-semibold text-slate-300 mb-1.5">Ai được đọc</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AUDIENCES).map(([v, l]) => (
              <label
                key={v}
                className={`px-3 py-1.5 rounded-xl border cursor-pointer select-none ${
                  form.audience.includes(v)
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.audience.includes(v)}
                  onChange={() => toggleAudience(v)}
                />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="font-semibold text-slate-300">Từ khóa / cách hỏi khác (giúp tìm trúng hơn)</span>
          <input
            maxLength={1000}
            value={form.keywords}
            onChange={set('keywords')}
            placeholder="vd: huy san, hoan tien, doi lich"
            className={inputCls}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex justify-between font-semibold text-slate-300">
            Nội dung
            <span className="font-normal text-slate-500">{form.content.length}/4000</span>
          </span>
          <textarea
            required
            minLength={20}
            maxLength={4000}
            rows={8}
            value={form.content}
            onChange={set('content')}
            className={`${inputCls} resize-y`}
          />
        </label>

        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="accent-cyan-500"
          />
          Đang dùng (bỏ chọn để tạm ẩn khỏi trợ lý)
        </label>

        {error && <p className="text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
          >
            Hủy
          </button>
          <button
            disabled={saving || form.audience.length === 0}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const AdminKnowledgePage = () => {
  const { showToast } = useApp();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ total: 0, data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (q.trim()) params.q = q.trim();
      if (category) params.category = category;
      setList(await apiClient.admin.knowledge.list(params));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, category, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const confirmDelete = async () => {
    try {
      await apiClient.admin.knowledge.remove(deleting.id);
      showToast('Đã xóa bài viết');
      setDeleting(null);
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <PageLayout
      tone="cyan"
      icon={BookOpen}
      eyebrow="Quản trị hệ thống"
      title="Kho Tri Thức Trợ Lý"
      description="Trợ lý chat truy xuất các bài viết này (RAG) để trả lời đúng quy trình, chính sách và các trang của web."
    >
      <div className="space-y-6">
        <RetrievalTester />

        <AdminCard
          title={`Bài viết (${list.total})`}
          icon={BookOpen}
          actions={
            <button
              onClick={() => setEditing({})}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm bài
            </button>
          }
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề, từ khóa, slug"
                className={`${inputCls} pl-9`}
              />
            </div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} sm:w-44`}
            >
              <option value="">Tất cả nhóm</option>
              {Object.entries(CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="text-xs text-rose-400">{error}</p>
          ) : loading && list.data.length === 0 ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : list.data.length === 0 ? (
            <EmptyNote>Chưa có bài viết phù hợp.</EmptyNote>
          ) : (
            <div className="divide-y divide-slate-800">
              {list.data.map((a) => (
                <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-white text-sm mr-1">{a.title}</span>
                      <Badge cls="bg-cyan-950 text-cyan-300">{CATEGORIES[a.category]}</Badge>
                      {!a.is_active && <Badge cls="bg-rose-950 text-rose-300">Đang ẩn</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono">{a.slug}</span>
                      {a.route && <span className="font-mono text-slate-400">· {a.route}</span>}
                      <span>·</span>
                      {a.audience.map((x) => (
                        <Badge key={x}>{AUDIENCES[x]}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{a.content}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(a)}
                      aria-label={`Sửa ${a.title}`}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => setDeleting(a)}
                      aria-label={`Xóa ${a.title}`}
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-rose-900 text-rose-300 hover:bg-rose-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <span>
                Trang {page}/{pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          )}
        </AdminCard>
      </div>

      {editing && (
        <ArticleForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <Modal title="Xóa bài viết?" icon={Trash2} tone="cyan" size="sm" onClose={() => setDeleting(null)}>
          <p className="text-slate-300">
            Bài <span className="font-bold text-white">{deleting.title}</span> sẽ bị xóa vĩnh viễn và trợ lý không dùng
            được nữa. Muốn tạm ẩn thì sửa bài và bỏ chọn "Đang dùng".
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setDeleting(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};
