import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank, Trophy, Wallet } from 'lucide-react';
import { apiClient } from '../services/api';
import { Card } from './ui/PageLayout';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const TXN_LABEL = { TOPUP: 'Nạp', BONUS: 'Tặng', PAY: 'Trả cọc', REFUND: 'Hoàn', ADMIN_REFUND: 'Admin hoàn trả' };

// Hồ sơ: ví hội viên theo cụm sân, quỹ dư & thành tích của đội
export const MyWalletsCard = () => {
  const [wallets, setWallets] = useState([]);
  const [team, setTeam] = useState(null);

  useEffect(() => {
    apiClient.wallets.mine().then((r) => setWallets(r.data || []), () => undefined);
    apiClient.teams.getMine().then((r) => setTeam(r.team), () => undefined);
  }, []);

  if (wallets.length === 0 && !team) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {team && (
        <Card className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            {team.name}
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-lg font-black text-white tabular-nums">{team.elo}</div>
              <div className="text-slate-500">Elo</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-sm font-black text-white tabular-nums">
                {team.wins}-{team.draws}-{team.losses}
              </div>
              <div className="text-slate-500">T-H-B</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-lg font-black text-white tabular-nums">{team.reputation_score}</div>
              <div className="text-slate-500">Uy tín đội</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <PiggyBank className="w-4 h-4 text-emerald-400" />
              Quỹ dư của đội
            </span>
            <b className="text-emerald-400 tabular-nums">{vnd(team.fund_balance)}</b>
          </div>
          <Link to="/bang-xep-hang" className="block text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Xem bảng xếp hạng →
          </Link>
        </Card>
      )}
      {wallets.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Ví hội viên
          </h2>
          {wallets.map((w) => (
            <div key={w.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <Link to={`/san/${w.venue_id}`} className="font-semibold text-white hover:text-emerald-300 truncate">
                  {w.venue_name}
                </Link>
                <b className={`tabular-nums ${w.status === 'FROZEN' ? 'text-rose-300' : 'text-emerald-400'}`}>{vnd(w.balance)}</b>
              </div>
              <div className="text-slate-500">
                {w.plan_name ? `Gói ${w.plan_name}` : 'Chưa có gói'}
                {w.discount_percent > 0 && ` · giảm ${w.discount_percent}% tiền sân`}
                {w.status === 'FROZEN' && ' · đóng băng, chờ admin hoàn tiền'}
              </div>
              {w.txns.slice(0, 3).map((t, i) => (
                <div key={i} className="flex justify-between text-slate-400">
                  <span>
                    {TXN_LABEL[t.type]} · {new Date(t.created_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-slate-300'}>
                    {Number(t.amount) >= 0 ? '+' : ''}
                    {vnd(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
