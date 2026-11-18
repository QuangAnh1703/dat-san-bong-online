import React, { useEffect, useState } from 'react';
import { Swords } from 'lucide-react';
import { errorMessage, useApp } from '../../context/AppContext';
import { apiClient } from '../../services/api';
import { Modal } from '../ui/Modal';
import { OWNER_PRIMARY_BTN } from './OwnerPage';

const SCORE_INPUT =
  'w-full h-12 rounded-xl bg-slate-800 border border-slate-700 text-white text-xl font-black text-center focus:outline-none focus:border-amber-500';

const dealText = (p) => (p === 50 ? 'chia đôi tiền sân' : p === 100 ? 'thua trả 100%' : `thua trả ${p}%`);

// Trận cáp kèo đã đá xong tại sân: chủ sân nhập tỷ số là chốt luôn (tính Elo, chia tiền sân theo kèo)
export const OwnerMatchResults = () => {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [score, setScore] = useState({ home: '', away: '' });
  const [busy, setBusy] = useState(false);

  const load = () => apiClient.league.pendingResults().then((r) => setItems(r.data || []), () => undefined);
  useEffect(() => {
    load();
  }, []);

  if (items.length === 0) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.league.recordResult(editing.code, Number(score.home), Number(score.away));
      showToast(`Đã chốt tỷ số trận ${editing.code} · đã tính Elo`);
      setEditing(null);
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-white">Trận cáp kèo cần nhập tỷ số ({items.length})</h2>
      {items.map((m) => (
        <div
          key={m.code}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-800 text-xs"
        >
          <Swords className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-white">
              {m.home_name} vs {m.away_name} <span className="font-mono text-amber-400">· {m.code}</span>
            </span>
            <span className="block text-slate-400">
              {new Date(m.starts_at).toLocaleString('vi-VN')} · {m.venue_name} · Kèo: {dealText(m.loser_percent)}
            </span>
          </span>
          <button
            onClick={() => {
              setEditing(m);
              setScore({ home: '', away: '' });
            }}
            className={`${OWNER_PRIMARY_BTN} shrink-0`}
          >
            Nhập tỷ số
          </button>
        </div>
      ))}

      {editing && (
        <Modal
          tone="amber"
          icon={Swords}
          title="Nhập Tỷ Số Trận"
          description={`${editing.code} · tỷ số được chốt ngay để tính Elo và chia tiền sân theo kèo, không sửa lại được`}
          onClose={() => setEditing(null)}
          size="sm"
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <label className="space-y-1">
                <span className="block text-slate-300 font-semibold truncate">{editing.home_name}</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="99"
                  value={score.home}
                  onChange={(e) => setScore({ ...score, home: e.target.value })}
                  className={SCORE_INPUT}
                />
              </label>
              <span className="text-slate-500 font-black pt-5">-</span>
              <label className="space-y-1">
                <span className="block text-slate-300 font-semibold truncate">{editing.away_name}</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="99"
                  value={score.away}
                  onChange={(e) => setScore({ ...score, away: e.target.value })}
                  className={SCORE_INPUT}
                />
              </label>
            </div>
            <button type="submit" disabled={busy} className={`w-full ${OWNER_PRIMARY_BTN}`}>
              {busy ? 'Đang chốt...' : 'Chốt tỷ số'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
