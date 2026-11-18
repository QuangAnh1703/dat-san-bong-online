import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Swords, Trophy } from 'lucide-react';
import { apiClient } from '../services/api';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

// Việc sau trận: khoản quỹ chưa đóng (PRD 2.1.8) + trận cáp kèo chờ chủ sân nhập tỷ số / đã chốt (PRD 2.1.9)
export const MyMatchTasks = () => {
  const [dues, setDues] = useState([]);
  const [results, setResults] = useState([]);

  const load = () => {
    apiClient.splits.mine().then((r) => setDues(r.data || []), () => undefined);
    apiClient.league.myResults().then((r) => setResults(r.data || []), () => undefined);
  };
  useEffect(load, []);

  const now = Date.now();
  const todo = results.filter((m) => new Date(m.ends_at).getTime() <= now && m.status !== 'CONFIRMED');

  const done = results.filter((m) => m.status === 'CONFIRMED').slice(0, 5);

  if (dues.length === 0 && todo.length === 0 && done.length === 0) return null;

  return (
    <div className="space-y-3">
      {dues.map((d) => (
        <Link
          key={d.id}
          to={`/chia-tien/${d.booking_code}`}
          className="flex items-center gap-3 p-3 rounded-2xl bg-rose-950/40 border border-rose-900 hover:border-rose-700 text-xs"
        >
          <HandCoins className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-white">
              Cần đóng {vnd(d.amount)} tiền trận {d.booking_code}
            </span>
            <span className="block text-slate-400">
              {d.venue_name} · {new Date(d.starts_at).toLocaleString('vi-VN')}
              {d.captain_name && ` · đội trưởng ${d.captain_name}`}
            </span>
          </span>
          <span className="text-rose-300 font-semibold shrink-0">Đóng ngay</span>
        </Link>
      ))}
      {todo.map((m) => (
        <div key={m.code} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <Swords className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-white">
              {m.home_name} vs {m.away_name}
            </span>
            <span className="block text-slate-400">
              {new Date(m.starts_at).toLocaleString('vi-VN')} · {m.venue_name}
              {m.deal_note && ` · Kèo: ${m.deal_note}`}
            </span>
          </span>
          <span className="text-amber-300 font-semibold shrink-0">Chờ chủ sân nhập tỷ số</span>
        </div>
      ))}

      {done.map((m) => {
        const draw = m.home_claim_home === m.home_claim_away;
        const mineAmount = Number(m.my_side === 'home' ? m.home_amount : m.away_amount);
        const myDelta = m.my_side === 'home' ? m.home_elo_delta : m.away_elo_delta;
        return (
          <div key={m.code} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-white">
                {m.home_name} {m.home_claim_home} - {m.home_claim_away} {m.away_name}
              </span>
              <span className="block text-slate-400">
                {new Date(m.starts_at).toLocaleString('vi-VN')} · {m.venue_name} · {m.deal_note}
              </span>
            </span>
            <span className="sm:text-right shrink-0">
              <span className="block font-bold text-white">
                Đội bạn chịu {vnd(mineAmount)}
                {m.total_amount && <span className="text-slate-500 font-normal"> / {vnd(m.total_amount)}</span>}
              </span>
              <span className="block text-slate-400">
                {draw ? 'Hòa · chia đôi' : `Thua trả ${m.loser_percent}%`} · Elo {myDelta >= 0 ? '+' : ''}
                {myDelta}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
