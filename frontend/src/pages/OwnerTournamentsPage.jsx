import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { toLocalISODate } from '../services/mappers';
import { Card } from '../components/ui/PageLayout';
import { OwnerPage, OWNER_INPUT, OWNER_PRIMARY_BTN } from '../components/owner/OwnerPage';
import { FORMAT_LABEL, tournamentStatus } from './LeaderboardPage';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const inDays = (d) => toLocalISODate(new Date(Date.now() + d * 86_400_000));

// Chủ sân / BTC tạo giải phong trào trên cụm sân của mình (PRD 2.1.9)
export const OwnerTournamentsPage = () => {
  const { managedPitch, showToast } = useApp();
  const fields = managedPitch?.subPitches || [];
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    format: 'ROUND_ROBIN',
    max_teams: 4,
    fee: 0,
    field_id: '',
    deadline_date: inDays(5),
    start_date: inDays(7),
    daily_start: '17:00',
    daily_end: '22:00',
    match_minutes: 60,
  });

  const load = () => apiClient.league.tournaments('?mine=1').then((r) => setList(r.data), () => setList([]));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (fields[0] && !fields.some((f) => f.id === form.field_id)) setForm((f) => ({ ...f, field_id: fields[0].id }));
  }, [managedPitch?.id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiClient.league.createTournament({
        venue_id: Number(managedPitch.id),
        field_id: Number(form.field_id),
        name: form.name,
        description: form.description || undefined,
        format: form.format,
        max_teams: Number(form.max_teams),
        fee: Number(form.fee) || 0,
        registration_deadline: new Date(`${form.deadline_date}T23:59:00`).toISOString(),
        start_date: form.start_date,
        daily_start: form.daily_start,
        daily_end: form.daily_end,
        match_minutes: Number(form.match_minutes),
      });
      showToast('Đã tạo giải đấu');
      setForm((f) => ({ ...f, name: '', description: '' }));
      load();
      return r;
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const label = 'text-slate-300 font-semibold block mb-1';

  return (
    <OwnerPage icon={Trophy} eyebrow="Giải đấu phong trào" description="Tạo giải, hệ thống tự chia bảng và xếp lịch vào khung giờ trống của sân.">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-400" />
            Tạo giải mới
          </h2>
          <form onSubmit={submit} className="space-y-3 text-xs">
            <div>
              <label className={label}>Tên giải</label>
              <input required maxLength={120} value={form.name} onChange={set('name')} placeholder="VD: Cúp Mùa Đông 2026" className={OWNER_INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Thể thức</label>
                <select value={form.format} onChange={set('format')} className={OWNER_INPUT}>
                  {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Số đội tối đa</label>
                <input required type="number" min="2" max="32" value={form.max_teams} onChange={set('max_teams')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={label}>Sân thi đấu</label>
                <select required value={form.field_id} onChange={set('field_id')} className={OWNER_INPUT}>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Lệ phí / đội</label>
                <input type="number" min="0" step="10000" value={form.fee} onChange={set('fee')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={label}>Hạn đăng ký</label>
                <input required type="date" value={form.deadline_date} onChange={set('deadline_date')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={label}>Ngày khai mạc</label>
                <input required type="date" value={form.start_date} onChange={set('start_date')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={label}>Xếp trận từ</label>
                <input required type="time" value={form.daily_start} onChange={set('daily_start')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={label}>Đến</label>
                <input required type="time" value={form.daily_end} onChange={set('daily_end')} className={OWNER_INPUT} />
              </div>
            </div>
            <div>
              <label className={label}>Thời lượng trận</label>
              <select value={form.match_minutes} onChange={set('match_minutes')} className={OWNER_INPUT}>
                {[60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} phút
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Mô tả / điều lệ</label>
              <textarea rows={3} maxLength={1000} value={form.description} onChange={set('description')} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" disabled={busy || !managedPitch} className={`w-full ${OWNER_PRIMARY_BTN}`}>
              {busy ? 'Đang tạo...' : 'Tạo giải đấu'}
            </button>
          </form>
        </Card>

        <div className="lg:col-span-3 space-y-3">
          {!list ? (
            <p className="text-xs text-slate-400">Đang tải...</p>
          ) : list.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              Bạn chưa tạo giải đấu nào.
            </div>
          ) : (
            list.map((t) => {
              const st = tournamentStatus(t);
              return (
                <Link key={t.id} to={`/giai-dau/${t.id}`} className="block p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-700 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{t.name}</span>
                    <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                  </div>
                  <div className="text-slate-400">
                    {t.venue_name} · {t.field_name} · {FORMAT_LABEL[t.format]} · {t.registered}/{t.max_teams} đội ·{' '}
                    {Number(t.fee) > 0 ? vnd(t.fee) : 'miễn phí'}
                  </div>
                  <div className="text-slate-500">Khai mạc {new Date(t.start_date).toLocaleDateString('vi-VN')}</div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </OwnerPage>
  );
};
