import React, { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiError } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote, useAdminRun } from '../components/admin/AdminShared';

const ROLE_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'player', label: 'Người chơi' },
  { value: 'owner', label: 'Chủ sân' },
  { value: 'admin', label: 'Admin' },
];

const StatusBadge = ({ u }) => (
  <span className={`text-[0.8125rem] font-bold ${u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
    {u.status === 'active' ? 'Hoạt động' : u.locked ? 'Đã khóa' : 'Chưa xác minh'}
  </span>
);

export const AdminUsersPage = () => {
  const { usersList, updateUserRole, setUserLocked, user } = useApp();
  const { busyId, run } = useAdminRun();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const s = search.trim().toLowerCase();
  const filtered = usersList.filter(
    (u) =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.phone.includes(s)),
  );

  const roleSelect = (u) => (
    <select
      value={u.role}
      aria-label={`Phân quyền ${u.name}`}
      disabled={busyId === u.id || u.id === user.id}
      title={u.id === user.id ? 'Không tự đổi quyền của chính mình' : undefined}
      onChange={(e) => run(u.id, () => updateUserRole(u.id, e.target.value))}
      className="h-8 px-2 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="player">Người chơi</option>
      <option value="owner">Chủ sân</option>
      <option value="admin">Admin</option>
    </select>
  );

  const lockButton = (u) =>
    u.id === user.id ? null : (
      <button
        disabled={busyId === u.id}
        onClick={() => {
          if (u.locked) {
            run(u.id, () => setUserLocked(u.id, false));
            return;
          }
          if (!confirm(`Khóa tài khoản ${u.name}? Người này sẽ không đăng nhập được.`)) return;
          run(u.id, async () => {
            try {
              await setUserLocked(u.id, true);
            } catch (err) {
              // Chủ sân còn đơn chưa diễn ra: hỏi lại, đồng ý thì khóa và hủy các đơn đó
              if (!(err instanceof ApiError) || err.code !== 'OWNER_HAS_UPCOMING_BOOKINGS') throw err;
              if (confirm(`${err.message}

Bạn chắc chắn muốn khóa?`)) await setUserLocked(u.id, true, true);
            }
          });
        }}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
          u.locked
            ? 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
            : 'bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300'
        }`}
      >
        {u.locked ? 'Mở khóa' : 'Khóa'}
      </button>
    );

  return (
    <PageLayout
      tone="cyan"
      icon={Users}
      eyebrow="Quản trị hệ thống"
      title="Quản Lý Người Dùng"
      description="Tra cứu tài khoản, đổi vai trò và khóa / mở khóa tài khoản vi phạm."
    >
      <AdminCard
        title={`Tài khoản (${filtered.length})`}
        icon={Users}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, sđt..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-none"
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              aria-pressed={roleFilter === f.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                roleFilter === f.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Mobile: dạng thẻ */}
        <ul className="sm:hidden divide-y divide-slate-800">
          {filtered.map((u) => (
            <li key={u.id} className="py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{u.name}</div>
                  <div className="text-xs text-slate-400 break-all">
                    {u.phone || '—'} · {u.email || '—'}
                  </div>
                </div>
                <StatusBadge u={u} />
              </div>
              <div className="flex items-center justify-between gap-2">
                {roleSelect(u)}
                {lockButton(u)}
              </div>
            </li>
          ))}
        </ul>

        {/* Từ sm: bảng */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Liên hệ</th>
                <th className="py-2.5 px-3">Ngày tạo</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Phân quyền</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">{u.name}</td>
                  <td className="py-3 px-3">
                    <div>{u.phone || '—'}</div>
                    <div className="text-[0.8125rem] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{u.createdAt}</td>
                  <td className="py-3 px-3">
                    <StatusBadge u={u} />
                  </td>
                  <td className="py-3 px-3 text-right">{roleSelect(u)}</td>
                  <td className="py-3 px-3 text-right">{lockButton(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyNote>Không có người dùng phù hợp.</EmptyNote>}
        <p className="text-[0.8125rem] text-slate-500">Hiển thị 100 tài khoản mới nhất.</p>
      </AdminCard>
    </PageLayout>
  );
};
