import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flame, Loader2, Medal, ShieldCheck, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';

const SORTS = [
  ['elo', 'Điểm Elo'],
  ['wins', 'Số trận thắng'],
  ['streak', 'Chuỗi thắng'],
  ['reputation', 'Uy tín'],
];
export const TOURNAMENT_STATUS = {
  OPEN: { text: 'Đang nhận đăng ký', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  ONGOING: { text: 'Đang thi đấu', cls: 'bg-amber-950 text-amber-400 border border-amber-800' },
  FINISHED: { text: 'Đã kết thúc', cls: 'bg-slate-800 text-slate-300' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
};
export const FORMAT_LABEL = { ROUND_ROBIN: 'Đá vòng tròn', KNOCKOUT: 'Loại trực tiếp' };
const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

// PRD 2.1.9: bảng xếp hạng đội theo khu vực / toàn hệ thống + danh sách giải phong trào
export const LeaderboardPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'giai-dau' ? 'tournaments' : 'ranking';

  return (
    <PageLayout
      backTo="/"
      icon={Trophy}
      eyebrow="Phong trào bóng đá"
      title="Bảng Xếp Hạng & Giải Đấu"
      description="Điểm Elo tính sau mỗi trận cáp kèo khi hai đội trưởng xác nhận cùng một tỷ số."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 sm:inline-grid">
          {[
            ['ranking', 'Bảng xếp hạng', ''],
            ['tournaments', 'Giải đấu', 'giai-dau'],
          ].map(([k, label, q]) => (
            <button
              key={k}
              onClick={() => setParams(q ? { tab: q } : {})}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${tab === k ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'ranking' ? <Ranking /> : <Tournaments />}
      </div>
    </PageLayout>
  );
};

const Ranking = () => {
  const { districts } = useApp();
  const [sort, setSort] = useState('elo');
  const [district, setDistrict] = useState('');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    apiClient.league.leaderboard(sort, district).then((r) => setRows(r.data), () => setRows([]));
  }, [sort, district]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          aria-label="Khu vực"
          className="h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs"
        >
          <option value="">Toàn hệ thống</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 overflow-x-auto">
          {SORTS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`h-10 px-3 rounded-xl border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                sort === k ? 'border-emerald-500 bg-emerald-950 text-emerald-300' : 'border-slate-700 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
          Khu vực này chưa có đội nào được xếp hạng.
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800">
          {rows.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 sm:px-4 py-3 text-xs">
              <span className={`w-7 text-center font-black tabular-nums ${t.rank <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                {t.rank <= 3 ? <Medal className="w-5 h-5 mx-auto" /> : t.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{t.name}</div>
                <div className="text-slate-500 truncate">
                  {t.district_name || 'Chưa chọn khu vực'} · {t.wins}T {t.draws}H {t.losses}B
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-slate-400 w-16" title="Chuỗi thắng">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                {t.win_streak}
              </div>
              <div className="hidden sm:flex items-center gap-1 text-slate-400 w-14" title="Uy tín">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t.reputation_score}
              </div>
              <div className="text-right w-14">
                <div className="text-base font-black text-white tabular-nums">{t.elo}</div>
                <div className="text-[0.6875rem] text-slate-500">Elo</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Tournaments = () => {
  const [list, setList] = useState(null);
  useEffect(() => {
    apiClient.league.tournaments('?status=OPEN,ONGOING,FINISHED').then((r) => setList(r.data), () => setList([]));
  }, []);

  if (!list) {
    return (
      <div className="py-10 flex justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
        Chưa có giải đấu nào. Chủ sân có thể tạo giải trong Góc chủ sân.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((t) => {
        const st = TOURNAMENT_STATUS[t.status];
        return (
          <Link key={t.id} to={`/giai-dau/${t.id}`} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-700 space-y-2 text-xs">
            <span className={`inline-block text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
            <h3 className="text-base font-bold text-white">{t.name}</h3>
            <div className="text-slate-400">
              {t.venue_name} · {t.field_name}
            </div>
            <div className="text-slate-300">
              {FORMAT_LABEL[t.format]} · {t.registered}/{t.max_teams} đội · lệ phí {Number(t.fee) > 0 ? vnd(t.fee) : 'miễn phí'}
            </div>
            <div className="text-slate-500">
              Khai mạc {new Date(t.start_date).toLocaleDateString('vi-VN')} · hạn đăng ký {new Date(t.registration_deadline).toLocaleString('vi-VN')}
            </div>
          </Link>
        );
      })}
    </div>
  );
};
