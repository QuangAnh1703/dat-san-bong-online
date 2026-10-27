import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Swords } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Modal } from './ui/Modal';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

const RESULT_STATUS = {
  PENDING: 'Chờ đội kia xác nhận',
  DISPUTED: 'Xung đột kết quả',
};

// Việc cần làm sau trận: khoản quỹ chưa đóng (PRD 2.1.8) + tỷ số cáp kèo chưa chốt (PRD 2.1.9)
export const MyMatchTasks = () => {
  const { showToast } = useApp();
  const [dues, setDues] = useState([]);
  const [results, setResults] = useState([]);
  const [editing, setEditing] = useState(null);
  const [score, setScore] = useState({ home: '', away: '' });

  const load = () => {
    apiClient.splits.mine().then((r) => setDues(r.data || []), () => undefined);
    apiClient.league.myResults().then((r) => setResults(r.data || []), () => undefined);
  };
  useEffect(load, []);

  const now = Date.now();
  const todo = results.filter((m) => new Date(m.ends_at).getTime() <= now && !['CONFIRMED', 'VOID'].includes(m.status));

  if (dues.length === 0 && todo.length === 0) return null;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await apiClient.league.submitResult(editing.code, Number(score.home), Number(score.away));
      showToast(
        r.status === 'CONFIRMED'
          ? 'Hai đội đã khớp tỷ số · đã tính điểm Elo'
          : r.status === 'DISPUTED'
            ? 'Tỷ số lệch với đội kia · hai bên có 12 tiếng để sửa'
            : 'Đã gửi tỷ số, chờ đội kia xác nhận',
        r.status === 'DISPUTED' ? 'error' : 'success',
      );
      setEditing(null);
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

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
      {todo.map((m) => {
        const mine = m.my_side === 'home' ? [m.home_claim_home, m.home_claim_away] : [m.away_claim_home, m.away_claim_away];
        const other = m.my_side === 'home' ? [m.away_claim_home, m.away_claim_away] : [m.home_claim_home, m.home_claim_away];
        return (
          <div key={m.code} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border text-xs ${m.status === 'DISPUTED' ? 'bg-amber-950/40 border-amber-800' : 'bg-slate-900 border-slate-800'}`}>
            <Swords className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-white">
                {m.home_name} vs {m.away_name}
              </span>
              <span className="block text-slate-400">
                {new Date(m.starts_at).toLocaleString('vi-VN')} · {m.venue_name}
                {m.status && ` · ${RESULT_STATUS[m.status]}`}
                {mine[0] !== null && ` · bạn nhập ${mine[0]}-${mine[1]}`}
                {other[0] !== null && ` · đội kia nhập ${other[0]}-${other[1]}`}
                {m.dispute_due_at && ` · hạn sửa ${new Date(m.dispute_due_at).toLocaleString('vi-VN')}`}
              </span>
            </span>
            <button
              onClick={() => {
                setEditing(m);
                setScore({ home: mine[0] ?? '', away: mine[1] ?? '' });
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shrink-0"
            >
              {mine[0] === null ? 'Nhập tỷ số' : 'Sửa tỷ số'}
            </button>
          </div>
        );
      })}

      {editing && (
        <Modal icon={Swords} title="Xác Nhận Tỷ Số" description="Hai đội trưởng nhập khớp nhau thì trận được tính điểm Elo" onClose={() => setEditing(null)} size="sm">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <label className="space-y-1">
                <span className="block text-slate-300 font-semibold truncate">{editing.home_name}</span>
                <input required type="number" min="0" max="99" value={score.home} onChange={(e) => setScore({ ...score, home: e.target.value })} className="w-full h-12 rounded-xl bg-slate-800 border border-slate-700 text-white text-xl font-black text-center" />
              </label>
              <span className="text-slate-500 font-black pt-5">-</span>
              <label className="space-y-1">
                <span className="block text-slate-300 font-semibold truncate">{editing.away_name}</span>
                <input required type="number" min="0" max="99" value={score.away} onChange={(e) => setScore({ ...score, away: e.target.value })} className="w-full h-12 rounded-xl bg-slate-800 border border-slate-700 text-white text-xl font-black text-center" />
              </label>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
              Gửi tỷ số
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
