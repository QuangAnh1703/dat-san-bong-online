import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Flag, Loader2, Shuffle, Trophy, Users } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';
import { FORMAT_LABEL, tournamentStatus } from './LeaderboardPage';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const TEAM_STATUS = { REGISTERED: 'Đã đóng lệ phí', PENDING_PAYMENT: 'Chờ lệ phí', WITHDRAWN: 'Rút / không đủ điều kiện' };

export const TournamentDetailPage = () => {
  const { id } = useParams();
  const { isLoggedIn, setIsAuthModalOpen, role, showToast } = useApp();
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({});
  const [confirmForfeit, setConfirmForfeit] = useState(null);

  const load = () =>
    apiClient.league.tournament(id).then(
      (r) => {
        setT(r);
        setError(null);
      },
      (err) => setError(errorMessage(err)),
    );
  useEffect(() => {
    load();
  }, [id, isLoggedIn]);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const r = await fn();
      if (msg) showToast(typeof msg === 'function' ? msg(r) : msg);
      await load();
      return r;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const tone = role === 'owner' ? 'amber' : role === 'admin' ? 'cyan' : 'emerald';
  if (error || !t) {
    return (
      <PageLayout backTo="/bang-xep-hang?tab=giai-dau" backLabel="Về danh sách giải" tone={tone} icon={Trophy} eyebrow="Giải đấu" title="Giải đấu">
        {error ? <p className="text-sm text-rose-300">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
      </PageLayout>
    );
  }

  const st = tournamentStatus(t);
  const myTeamId = t.my?.team?.id;
  const reg = t.my?.registration;
  const open = t.status === 'OPEN' && new Date(t.registration_deadline) > new Date();
  const rounds = [...new Set(t.matches.map((m) => m.round))];
  const knockoutRoundDone =
    t.format === 'KNOCKOUT' && t.status === 'ONGOING' && t.matches.length > 0 && !t.matches.some((m) => m.status === 'SCHEDULED');

  const register = async () => {
    if (!isLoggedIn) return setIsAuthModalOpen(true);
    const r = await run(() => apiClient.league.register(t.id));
    if (r) showToast('Đã đăng ký tham gia giải');
  };

  return (
    <PageLayout
      backTo="/bang-xep-hang?tab=giai-dau"
      backLabel="Về danh sách giải"
      tone={tone}
      icon={Trophy}
      eyebrow={FORMAT_LABEL[t.format]}
      title={t.name}
      description={`${t.venue_name} · ${t.field_name} · khai mạc ${new Date(t.start_date).toLocaleDateString('vi-VN')}`}
      actions={
        t.is_organizer && (t.status === 'OPEN' || knockoutRoundDone) ? (
          <button
            disabled={busy}
            onClick={() =>
              run(() => apiClient.league.schedule(t.id), (r) => (r.status === 'FINISHED' ? 'Giải đã kết thúc' : 'Đã chia bảng & xếp lịch thi đấu'))
            }
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            {t.status === 'OPEN' ? 'Chia bảng & xếp lịch' : 'Xếp vòng tiếp theo'}
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
              <span className="text-slate-300">
                {t.registered}/{t.max_teams} đội · lệ phí {Number(t.fee) > 0 ? vnd(t.fee) : 'miễn phí'} · trận {t.match_minutes} phút ·{' '}
                {hhmm(t.daily_start_minute)}-{hhmm(t.daily_end_minute)} hằng ngày
              </span>
            </div>
            {t.description && <p className="text-xs text-slate-400 mt-2 whitespace-pre-line">{t.description}</p>}
            <p className="text-xs text-slate-500 mt-2">
              Hạn đăng ký {new Date(t.registration_deadline).toLocaleString('vi-VN')}. Đội bỏ trận bị xử thua 0-3, trừ 20 điểm uy tín và cấm đăng ký giải 30 ngày.
            </p>
          </Card>

          {t.standings && t.matches.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold text-white mb-3">Bảng xếp hạng</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="text-left">
                      <th className="py-1.5 pr-2">Đội</th>
                      {['Tr', 'T', 'H', 'B', 'HS', 'Đ'].map((h) => (
                        <th key={h} className="py-1.5 px-1 text-center">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {t.standings.map((r) => (
                      <tr key={r.team_id} className={String(r.team_id) === String(myTeamId) ? 'text-emerald-300' : 'text-slate-200'}>
                        <td className="py-2 pr-2 font-semibold">
                          {r.group_label && <span className="text-slate-500 mr-1">{r.group_label}</span>}
                          {r.name}
                        </td>
                        {[r.played, r.won, r.drawn, r.lost, r.gf - r.ga, r.points].map((v, i) => (
                          <td key={i} className={`py-2 px-1 text-center tabular-nums ${i === 5 ? 'font-black text-white' : ''}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              Lịch thi đấu
            </h2>
            {t.matches.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa xếp lịch. Lịch tự động khớp khung giờ trống của sân khi BTC chốt danh sách.</p>
            ) : (
              <div className="space-y-4">
                {rounds.map((r) => (
                  <div key={r}>
                    <div className="text-xs font-bold text-slate-400 mb-1.5">{t.format === 'KNOCKOUT' ? `Vòng ${r}` : `Lượt ${r}`}</div>
                    <div className="divide-y divide-slate-800 rounded-xl border border-slate-800">
                      {t.matches
                        .filter((m) => m.round === r)
                        .map((m) => {
                          const mine = [String(m.home_team_id), String(m.away_team_id)].includes(String(myTeamId));
                          const s = scores[m.id] || { home: '', away: '' };
                          return (
                            <div key={m.id} className="px-3 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold ${mine ? 'text-emerald-300' : 'text-white'}`}>
                                  {m.group_label && <span className="text-slate-500 mr-1">Bảng {m.group_label} ·</span>}
                                  {m.home_name} {m.status === 'BYE' ? '' : `vs ${m.away_name}`}
                                </div>
                                <div className="text-slate-500">
                                  {m.status === 'BYE'
                                    ? 'Được miễn đấu vòng này'
                                    : m.starts_at
                                      ? new Date(m.starts_at).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                      : ''}
                                  {m.status === 'FORFEIT' && ' · xử thua 0-3 do bỏ trận'}
                                </div>
                              </div>
                              {['PLAYED', 'FORFEIT'].includes(m.status) && (
                                <span className="text-base font-black text-white tabular-nums">
                                  {m.home_score} - {m.away_score}
                                </span>
                              )}
                              {m.status === 'SCHEDULED' && t.is_organizer && (
                                <div className="flex items-center gap-1.5">
                                  {['home', 'away'].map((k) => (
                                    <input
                                      key={k}
                                      type="number"
                                      min="0"
                                      max="99"
                                      value={s[k]}
                                      aria-label={k === 'home' ? m.home_name : m.away_name}
                                      onChange={(e) => setScores({ ...scores, [m.id]: { ...s, [k]: e.target.value } })}
                                      className="w-12 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white text-center"
                                    />
                                  ))}
                                  <button
                                    disabled={busy || s.home === '' || s.away === ''}
                                    onClick={() => run(() => apiClient.league.matchResult(m.id, Number(s.home), Number(s.away)), 'Đã lưu kết quả')}
                                    className="h-8 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold disabled:opacity-50 cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              )}
                              {m.status === 'SCHEDULED' && mine && !t.is_organizer && (
                                <button
                                  onClick={() => setConfirmForfeit(m)}
                                  className="px-3 py-1.5 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/60 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Flag className="w-3.5 h-3.5" /> Bỏ trận
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {role === 'player' && (
            <Card>
              <h2 className="text-sm font-bold text-white mb-2">Đăng ký tham gia</h2>
              {!isLoggedIn ? (
                <button onClick={() => setIsAuthModalOpen(true)} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer">
                  Đăng nhập để đăng ký
                </button>
              ) : !t.my ? (
                <p className="text-xs text-slate-400">Bạn cần tạo đội bóng trong Hồ sơ và là đội trưởng để đăng ký giải.</p>
              ) : reg && reg.status !== 'WITHDRAWN' ? (
                <div className="text-xs space-y-2">
                  <p className={reg.status === 'REGISTERED' ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
                    {t.my.team.name}: {TEAM_STATUS[reg.status]}
                  </p>
                  {reg.status === 'PENDING_PAYMENT' && (
                    <p className="text-slate-400">Thanh toán lệ phí online chưa được hỗ trợ.</p>
                  )}
                </div>
              ) : open && Number(t.fee) > 0 ? (
                <p className="text-xs text-slate-400">Giải có lệ phí {vnd(t.fee)}: tạm chưa nhận đăng ký online vì chưa hỗ trợ thanh toán lệ phí.</p>
              ) : open ? (
                <button disabled={busy} onClick={register} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer">
                  Đăng ký {t.my.team.name}
                </button>
              ) : (
                <p className="text-xs text-slate-400">Giải đã đóng đăng ký.</p>
              )}
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Đội tham gia
            </h2>
            {t.teams.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có đội đăng ký.</p>
            ) : (
              <div className="divide-y divide-slate-800 text-xs">
                {t.teams.map((x) => (
                  <div key={x.team_id} className="py-2 flex justify-between gap-2">
                    <span className={x.status === 'WITHDRAWN' ? 'text-slate-500 line-through' : 'text-white font-semibold'}>
                      {x.group_label && <span className="text-slate-500 mr-1">{x.group_label}</span>}
                      {x.name}
                    </span>
                    <span className={x.status === 'REGISTERED' ? 'text-emerald-400' : 'text-slate-500'}>
                      {TEAM_STATUS[x.status]} · Elo {x.elo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {confirmForfeit && (
        <Modal icon={Flag} title="Bỏ Trận Đấu?" description={`${confirmForfeit.home_name} vs ${confirmForfeit.away_name}`} onClose={() => setConfirmForfeit(null)} size="sm">
          <p className="text-rose-300">Đội của bạn sẽ bị xử thua 0-3, trừ 20 điểm uy tín đội và bị cấm đăng ký giải trong 30 ngày.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setConfirmForfeit(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold cursor-pointer">
              Quay lại
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                await run(() => apiClient.league.forfeit(confirmForfeit.id), 'Đã ghi nhận bỏ trận');
                setConfirmForfeit(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Vẫn bỏ trận
            </button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};
