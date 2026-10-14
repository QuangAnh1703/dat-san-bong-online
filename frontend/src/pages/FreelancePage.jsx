import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Users,
  MapPin,
  Clock,
  Wallet,
  Shield,
  Star,
  Plus,
  Send,
  Loader2,
  Phone,
  AlertTriangle,
  Inbox,
  Flame,
} from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';
import {
  FREELANCE_LEVELS,
  PERIODS,
  formatViDate,
  levelLabel,
  mapFreelanceMine,
  mapFreelanceRequest,
  mapPlayerPost,
  mapRecruit,
  positionLabel,
} from '../services/mappers';

const TABS = [
  { key: 'doi-tim-nguoi', label: 'Đội bóng tìm người', short: 'Đội tìm người' },
  { key: 'nguoi-tim-doi', label: 'Người chơi tìm đội', short: 'Người tìm đội' },
  { key: 'cua-toi', label: 'Của tôi', short: 'Của tôi' },
];
const TAB_KEYS = TABS.map((t) => t.key);

const REQUEST_STATUS = {
  PENDING: { text: 'Chờ phản hồi', cls: 'bg-amber-950 text-amber-300 border-amber-800' },
  ACCEPTED: { text: 'Đã chấp nhận', cls: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  REJECTED: { text: 'Bị từ chối', cls: 'bg-rose-950 text-rose-300 border-rose-800' },
  EXPIRED: { text: 'Đã hết hạn', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
  CANCELLED: { text: 'Đã hủy tham gia', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const POST_STATUS = {
  OPEN: { text: 'Đang tuyển', cls: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  MATCHED: { text: 'Đã đủ người', cls: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  CLOSED: { text: 'Đã đóng', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
  EXPIRED: { text: 'Đã hết hạn tuyển', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:border-emerald-500 focus:outline-none';
const primaryBtn =
  'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors';
const ghostBtn =
  'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 font-semibold text-xs cursor-pointer transition-colors';

const Badge = ({ status, map }) => {
  const s = map[status] || { text: status, cls: 'bg-slate-800 text-slate-300 border-slate-700' };
  return <span className={`px-2 py-0.5 rounded-full border text-[0.75rem] font-bold ${s.cls}`}>{s.text}</span>;
};

const Positions = ({ list }) => (
  <span className="flex flex-wrap gap-1">
    {list.map((p) => (
      <span key={p} className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[0.75rem] font-semibold">
        {positionLabel(p)}
      </span>
    ))}
  </span>
);

const Field = ({ label, children }) => (
  <div>
    <label className="text-slate-300 font-semibold block mb-1">{label}</label>
    {children}
  </div>
);

const ErrorBox = ({ children }) =>
  children ? (
    <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300">{children}</div>
  ) : null;

const minutesLeft = (ts, now) => Math.max(0, Math.ceil((ts - now) / 60000));

export const FreelancePage = () => {
  const { isLoggedIn, user, bookings, districts, districtName, setIsAuthModalOpen, reloadBookings, showToast } =
    useApp();
  const [params] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'doi-tim-nguoi';

  const [filters, setFilters] = useState({ district: '', period: '', level: '', cost: '' });
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const [applyTarget, setApplyTarget] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [requestsFor, setRequestsFor] = useState(null);

  // Đếm ngược 30 phút của lời mời
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const upcomingOwned = bookings.filter(
    (b) =>
      !b.isParticipant &&
      !b.sessionsTotal &&
      ['HELD', 'PENDING_VERIFY', 'CONFIRMED'].includes(b.rawStatus) &&
      b.startsAt > now,
  );

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setLoadError(null);
    try {
      const f = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      if (tab === 'doi-tim-nguoi') {
        setItems(((await apiClient.freelance.getRecruits({ ...f, limit: 50 })).data || []).map(mapRecruit));
      } else if (tab === 'nguoi-tim-doi') {
        delete f.cost;
        const res = await apiClient.freelance.getPlayers({ ...f, limit: 50 });
        setItems((res.data || []).map((p) => mapPlayerPost(p, districtName)));
      } else {
        setMine(mapFreelanceMine(await apiClient.freelance.getMine(), districtName));
      }
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, tab, filters, districtName]);

  useEffect(() => {
    setItems([]);
    load();
  }, [load]);

  const navigate = useNavigate();
  const requireLogin = (to) => () => (isLoggedIn ? navigate(to) : setIsAuthModalOpen(true));

  const afterChange = async (message) => {
    if (message) showToast(message);
    await Promise.all([load(), reloadBookings()]);
  };

  const respond = async (requestId, status) => {
    try {
      await apiClient.freelance.respond(requestId, status);
      await afterChange(status === 'ACCEPTED' ? 'Đã chấp nhận. Trận đấu đã được thêm vào lịch.' : 'Đã từ chối.');
      return true;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      await load();
      return false;
    }
  };

  const closePost = async (postId) => {
    if (!confirm('Đóng bài đăng này? Các yêu cầu đang chờ sẽ bị từ chối.')) return;
    try {
      await apiClient.freelance.closePost(postId);
      await afterChange('Đã đóng bài đăng.');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const actions = (
    <>
      <button onClick={requireLogin('/ghep-chan-le/dang-tuyen')} className={primaryBtn}>
        <UserPlus className="w-4 h-4" />
        <span>Đăng bài tìm chân lẻ</span>
      </button>
      <button onClick={requireLogin('/ghep-chan-le/dang-tin')} className={ghostBtn + ' flex items-center gap-1.5'}>
        <Plus className="w-4 h-4" />
        <span>Đăng tin tìm đội</span>
      </button>
    </>
  );

  return (
    <PageLayout
      backTo="/"
      icon={Users}
      eyebrow="Ghép chân lẻ"
      title="Ghép người chơi lẻ"
      description="Đội thiếu người đăng tin tuyển chân lẻ, người chơi lẻ xin vào trận hoặc đăng tin chờ đội mời."
      actions={actions}
    >
      <nav className="grid grid-cols-3 gap-1 p-1 mb-6 rounded-xl bg-slate-900 border border-slate-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={`/ghep-chan-le?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`py-2 px-1 rounded-lg text-center text-xs font-bold transition-colors ${
              tab === t.key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        ))}
      </nav>

      {!isLoggedIn ? (
        <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 p-8">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Đăng nhập để ghép đội và tìm chân lẻ</p>
          <button onClick={() => setIsAuthModalOpen(true)} className={primaryBtn + ' mx-auto mt-4'}>
            Đăng nhập
          </button>
        </div>
      ) : (
        <>
          {tab !== 'cua-toi' && <Filters tab={tab} filters={filters} setFilters={setFilters} districts={districts} />}

          {loadError ? (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-900 text-sm text-rose-300 flex flex-wrap items-center gap-3">
              <span>Không tải được dữ liệu: {loadError}</span>
              <button onClick={load} className={ghostBtn}>
                Thử lại
              </button>
            </div>
          ) : loading && !items.length && !mine ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải...</span>
            </div>
          ) : tab === 'doi-tim-nguoi' ? (
            <RecruitList items={items} onApply={setApplyTarget} onRequests={(p) => setRequestsFor(p)} />
          ) : tab === 'nguoi-tim-doi' ? (
            <PlayerList items={items} userId={user.id} onInvite={setInviteTarget} />
          ) : (
            mine && (
              <MineTab
                mine={mine}
                now={now}
                onRespond={respond}
                onRequests={(p) => setRequestsFor(p)}
                onClose={closePost}
              />
            )
          )}
        </>
      )}

      {applyTarget && (
        <ApplyModal
          post={applyTarget}
          onClose={() => setApplyTarget(null)}
          onDone={async () => {
            setApplyTarget(null);
            await afterChange('Đã gửi yêu cầu. Đội trưởng sẽ xem hồ sơ và phản hồi.');
          }}
          onFull={async () => {
            setApplyTarget(null);
            await load();
          }}
        />
      )}

      {inviteTarget && (
        <InviteModal
          player={inviteTarget}
          bookings={upcomingOwned}
          onClose={() => setInviteTarget(null)}
          onDone={async () => {
            setInviteTarget(null);
            await afterChange('Đã gửi lời mời. Lời mời tự hết hạn sau 30 phút nếu không được phản hồi.');
          }}
        />
      )}

      {requestsFor && (
        <RequestsModal
          post={requestsFor}
          onClose={() => setRequestsFor(null)}
          onRespond={async (id, status) => {
            if (await respond(id, status)) setRequestsFor(null);
          }}
        />
      )}
    </PageLayout>
  );
};

// ------------------------------------------------------------------ bộ lọc

const Filters = ({ tab, filters, setFilters, districts }) => {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const selectCls =
    'h-9 px-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none';
  return (
    <div className={`grid grid-cols-2 ${tab === 'doi-tim-nguoi' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2 mb-5`}>
      <select aria-label="Khu vực" value={filters.district} onChange={set('district')} className={selectCls}>
        <option value="">Mọi khu vực</option>
        {districts.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}
          </option>
        ))}
      </select>
      <select aria-label="Khung giờ" value={filters.period} onChange={set('period')} className={selectCls}>
        <option value="">Mọi khung giờ</option>
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <select aria-label="Trình độ" value={filters.level} onChange={set('level')} className={selectCls}>
        <option value="">Mọi trình độ</option>
        {FREELANCE_LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      {tab === 'doi-tim-nguoi' && (
        <select aria-label="Chi phí" value={filters.cost} onChange={set('cost')} className={selectCls}>
          <option value="">Mọi chi phí</option>
          <option value="FREE">Miễn phí</option>
          <option value="FIXED">Đóng tiền cố định</option>
          <option value="VOLUNTARY">Tự nguyện</option>
        </select>
      )}
    </div>
  );
};

const Empty = ({ title, hint }) => (
  <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 p-8">
    <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
    <p className="text-sm font-bold text-white">{title}</p>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

// ------------------------------------------------------------------ tab Đội bóng tìm người

const RecruitList = ({ items, onApply, onRequests }) =>
  items.length === 0 ? (
    <Empty title="Chưa có đội nào đang tìm người" hint="Thử bộ lọc khác hoặc đăng tin tìm đội để các đội mời bạn." />
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <article key={p.id} className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {p.bumped && (
                <div className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-rose-300 mb-1">
                  <Flame className="w-3.5 h-3.5" /> Cần người gấp
                </div>
              )}
              <h3 className="text-base font-bold text-white truncate">{p.teamName}</h3>
              <div className="text-xs text-slate-400">Đội trưởng: {p.authorName}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-black text-emerald-400 tabular-nums">{p.slotsNeeded - p.slotsFilled}</div>
              <div className="text-[0.75rem] text-slate-400">chỗ trống / {p.slotsNeeded}</div>
            </div>
          </div>

          <div className="space-y-1.5 py-3 border-y border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {p.venueName}
                {p.district && <span className="text-slate-500"> · {p.district}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{p.when}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-300 font-semibold">{p.cost}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Trình độ: {levelLabel(p.level)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">Cần:</span>
              <Positions list={p.positions} />
            </div>
          </div>

          {p.note && <p className="text-xs text-slate-400 italic line-clamp-2">"{p.note}"</p>}

          <div className="mt-auto flex justify-end">
            {p.pendingRequests !== null ? (
              <button onClick={() => onRequests(p)} className={ghostBtn + ' flex items-center gap-1.5'}>
                <Inbox className="w-3.5 h-3.5" /> Yêu cầu ({p.pendingRequests})
              </button>
            ) : p.myRequestStatus && p.myRequestStatus !== 'CANCELLED' && p.myRequestStatus !== 'EXPIRED' ? (
              <Badge status={p.myRequestStatus} map={REQUEST_STATUS} />
            ) : (
              <button onClick={() => onApply(p)} className={primaryBtn}>
                <Send className="w-3.5 h-3.5" /> Xin tham gia
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );

// ------------------------------------------------------------------ tab Người chơi tìm đội

const PlayerList = ({ items, userId, onInvite }) =>
  items.length === 0 ? (
    <Empty
      title="Chưa có người chơi lẻ nào đang tìm đội"
      hint="Thử bộ lọc khác hoặc đăng bài tìm chân lẻ cho trận của đội."
    />
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <article key={p.id} className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">{p.name}</h3>
              <div className="text-xs text-slate-400">{p.matches} trận đã đá</div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-900 text-amber-300 text-xs font-bold shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{p.reputation}</span>
              <span className="sr-only">điểm uy tín</span>
            </div>
          </div>
          <div className="space-y-1.5 py-3 border-y border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">Rảnh {p.when}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{p.districts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Trình độ: {levelLabel(p.level)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">Vị trí:</span>
              <Positions list={p.positions} />
            </div>
          </div>
          {p.note && <p className="text-xs text-slate-400 italic line-clamp-2">"{p.note}"</p>}
          <div className="mt-auto flex justify-end">
            {p.authorId === userId ? (
              <span className="text-xs text-slate-500">Tin của bạn</span>
            ) : p.myInviteStatus === 'PENDING' || p.myInviteStatus === 'ACCEPTED' ? (
              <Badge status={p.myInviteStatus} map={REQUEST_STATUS} />
            ) : (
              <button onClick={() => onInvite(p)} className={primaryBtn}>
                <UserPlus className="w-3.5 h-3.5" /> Mời vào đội
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );

// ------------------------------------------------------------------ tab Của tôi

const Section = ({ title, count, children }) => (
  <section className="space-y-3">
    <h2 className="text-sm font-bold text-white">
      {title} <span className="text-slate-500 tabular-nums">({count})</span>
    </h2>
    {children}
  </section>
);

const Row = ({ children }) => (
  <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    {children}
  </div>
);

const MatchInfo = ({ m, showAddress }) => (
  <div className="text-xs text-slate-400 space-y-0.5">
    <div className="text-white font-semibold">{m.venueName}</div>
    <div>{m.when}</div>
    {showAddress && m.venueAddress && (
      <div className="flex items-start gap-1.5 text-slate-300">
        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <span>{m.venueAddress}</span>
      </div>
    )}
  </div>
);

const PhoneLine = ({ name, phone }) =>
  phone ? (
    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
      <Phone className="w-3.5 h-3.5" /> {name}: {phone}
    </a>
  ) : null;

const MineTab = ({ mine, now, onRespond, onRequests, onClose }) => {
  const received = mine.invites.filter((i) => !i.sentByMe);
  const sent = mine.invites.filter((i) => i.sentByMe);
  const [busy, setBusy] = useState(null);
  const act = async (id, status) => {
    setBusy(id);
    await onRespond(id, status);
    setBusy(null);
  };

  const nothing =
    !mine.recruits.length && !mine.playerPosts.length && !mine.applications.length && !mine.invites.length;
  if (nothing) {
    return (
      <Empty
        title="Bạn chưa có hoạt động ghép đội nào"
        hint="Đăng bài tìm chân lẻ cho trận đã đặt, hoặc đăng tin tìm đội khi bạn rảnh."
      />
    );
  }

  return (
    <div className="space-y-8">
      {received.length > 0 && (
        <Section title="Lời mời vào đội" count={received.length}>
          {received.map((i) => {
            const live = i.status === 'PENDING' && i.expiresAt > now;
            return (
              <Row key={i.id}>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{i.teamName}</span>
                    <Badge status={live || i.status !== 'PENDING' ? i.status : 'EXPIRED'} map={REQUEST_STATUS} />
                  </div>
                  <MatchInfo m={i} showAddress />
                  {i.cost && <div className="text-xs text-amber-300 font-semibold">Chi phí: {i.cost}</div>}
                  {i.message && <div className="text-xs text-slate-400 italic">"{i.message}"</div>}
                  {i.status === 'ACCEPTED' && <PhoneLine name="Đội trưởng" phone={i.captainPhone} />}
                  {live && (
                    <div className="text-[0.75rem] text-amber-300">
                      Còn {minutesLeft(i.expiresAt, now)} phút để phản hồi
                    </div>
                  )}
                </div>
                {live && (
                  <div className="flex gap-2 shrink-0">
                    <button disabled={busy === i.id} onClick={() => act(i.id, 'ACCEPTED')} className={primaryBtn}>
                      Chấp nhận
                    </button>
                    <button disabled={busy === i.id} onClick={() => act(i.id, 'REJECTED')} className={ghostBtn}>
                      Từ chối
                    </button>
                  </div>
                )}
              </Row>
            );
          })}
        </Section>
      )}

      {mine.recruits.length > 0 && (
        <Section title="Bài tuyển chân lẻ của đội" count={mine.recruits.length}>
          {mine.recruits.map((p) => (
            <Row key={p.id}>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white tabular-nums">
                    Đã tuyển {p.slotsFilled}/{p.slotsNeeded} người
                  </span>
                  <Badge status={p.status} map={POST_STATUS} />
                </div>
                <MatchInfo m={p} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <Positions list={p.positions} /> · {levelLabel(p.level)} · {p.cost}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onRequests(p)} className={ghostBtn + ' flex items-center gap-1.5'}>
                  <Inbox className="w-3.5 h-3.5" /> Yêu cầu ({p.pendingRequests})
                </button>
                {p.status === 'OPEN' && (
                  <button onClick={() => onClose(p.id)} className={ghostBtn}>
                    Đóng bài
                  </button>
                )}
              </div>
            </Row>
          ))}
        </Section>
      )}

      {mine.applications.length > 0 && (
        <Section title="Trận mình xin tham gia" count={mine.applications.length}>
          {mine.applications.map((a) => (
            <Row key={a.id}>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">{a.teamName}</span>
                  <Badge status={a.status} map={REQUEST_STATUS} />
                </div>
                <MatchInfo m={a} showAddress={a.status === 'ACCEPTED'} />
                {a.cost && <div className="text-xs text-amber-300 font-semibold">Chi phí: {a.cost}</div>}
                {a.status === 'ACCEPTED' && <PhoneLine name="Đội trưởng" phone={a.captainPhone} />}
              </div>
              {a.status === 'ACCEPTED' && (
                <Link to="/lich-cua-toi" className={ghostBtn + ' shrink-0 text-center'}>
                  Xem trong lịch
                </Link>
              )}
            </Row>
          ))}
        </Section>
      )}

      {mine.playerPosts.length > 0 && (
        <Section title="Tin tìm đội của mình" count={mine.playerPosts.length}>
          {mine.playerPosts.map((p) => (
            <Row key={p.id}>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">Rảnh {p.when}</span>
                  <Badge
                    status={p.status}
                    map={{
                      ...POST_STATUS,
                      OPEN: { ...POST_STATUS.OPEN, text: 'Đang chờ đội mời' },
                      MATCHED: { ...POST_STATUS.MATCHED, text: 'Đã ghép trận' },
                      EXPIRED: { ...POST_STATUS.EXPIRED, text: 'Đã hết hạn' },
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400">{p.districts}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <Positions list={p.positions} /> · {levelLabel(p.level)}
                </div>
              </div>
              {p.status === 'OPEN' && (
                <button onClick={() => onClose(p.id)} className={ghostBtn + ' shrink-0'}>
                  Gỡ tin
                </button>
              )}
            </Row>
          ))}
        </Section>
      )}

      {sent.length > 0 && (
        <Section title="Lời mời đội đã gửi" count={sent.length}>
          {sent.map((i) => (
            <Row key={i.id}>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">{i.playerName}</span>
                  <Badge
                    status={i.status === 'PENDING' && i.expiresAt <= now ? 'EXPIRED' : i.status}
                    map={REQUEST_STATUS}
                  />
                </div>
                <MatchInfo m={i} />
                {i.status === 'PENDING' && i.expiresAt > now && (
                  <div className="text-[0.75rem] text-amber-300">
                    Tự hết hạn sau {minutesLeft(i.expiresAt, now)} phút
                  </div>
                )}
              </div>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ hộp thoại

const bookingOption = (b) => `${b.pitchName} · ${b.subPitchName} · ${formatViDate(b.date)} ${b.startTime}-${b.endTime}`;

const ApplyModal = ({ post, onClose, onDone, onFull }) => {
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const send = async (confirmLevel) => {
    setSending(true);
    setError(null);
    try {
      await apiClient.freelance.apply(post.id, { message: message.trim(), confirm_level: confirmLevel });
      await onDone();
    } catch (err) {
      if (err.code === 'LEVEL_MISMATCH') setWarning(err.message);
      else {
        setError(errorMessage(err));
        if (err.code === 'RECRUIT_FULL') onFull();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Xin tham gia" description={`${post.teamName} · ${post.when}`} icon={Send} onClose={onClose}>
      {warning ? (
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 flex gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p>{warning}</p>
          </div>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={ghostBtn + ' flex-1 py-2.5'}>
              Thôi, chọn trận khác
            </button>
            <button disabled={sending} onClick={() => send(true)} className={primaryBtn + ' flex-1 py-2.5'}>
              {sending ? 'Đang gửi...' : 'Vẫn gửi yêu cầu'}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(false);
          }}
          className="space-y-3.5 text-xs"
        >
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
            <div>• Sân: {post.venueName}</div>
            <div>
              • Cần: {post.positions.map(positionLabel).join(', ')} · {levelLabel(post.level)}
            </div>
            <div>• Chi phí: {post.cost}</div>
          </div>
          <Field label="Lời nhắn cho đội trưởng">
            <textarea
              rows={3}
              maxLength={300}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ví dụ: Mình đá vị trí hậu vệ, tối nay tham gia được"
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none"
            />
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={ghostBtn + ' flex-1 py-2.5'}>
              Hủy
            </button>
            <button type="submit" disabled={sending} className={primaryBtn + ' flex-1 py-2.5'}>
              {sending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

const InviteModal = ({ player, bookings, onClose, onDone }) => {
  const [bookingCode, setBookingCode] = useState(bookings[0]?.id || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await apiClient.freelance.invite(player.id, { booking_code: bookingCode, message: message.trim() });
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Mời vào đội" description={`${player.name} · rảnh ${player.when}`} icon={UserPlus} onClose={onClose}>
      {bookings.length === 0 ? (
        <p className="text-xs text-slate-300">Bạn cần có trận sắp tới đã đặt sân để mời người chơi.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <Field label="Mời vào trận">
            <select value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} className={inputCls}>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {bookingOption(b)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lời nhắn">
            <textarea
              rows={2}
              maxLength={300}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ví dụ: Đội mình thiếu 1 hậu vệ, đá vui vẻ"
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none"
            />
          </Field>
          <p className="text-slate-400">Lời mời tự hết hạn nếu người chơi không phản hồi trong 30 phút.</p>
          <ErrorBox>{error}</ErrorBox>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={ghostBtn + ' flex-1 py-2.5'}>
              Hủy
            </button>
            <button type="submit" disabled={sending} className={primaryBtn + ' flex-1 py-2.5'}>
              {sending ? 'Đang gửi...' : 'Gửi lời mời'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

const RequestsModal = ({ post, onClose, onRespond }) => {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    apiClient.freelance
      .getRequests(post.id)
      .then((res) => setList((res.data || []).map(mapFreelanceRequest)))
      .catch((err) => setError(errorMessage(err)));
  }, [post.id]);

  const act = async (id, status) => {
    setBusy(id);
    await onRespond(id, status);
    setBusy(null);
  };

  return (
    <Modal
      title="Người chơi xin tham gia"
      description={`Đã tuyển ${post.slotsFilled}/${post.slotsNeeded} · ${post.when}`}
      icon={Inbox}
      onClose={onClose}
    >
      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : !list ? (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : list.length === 0 ? (
        <p className="text-slate-400">Chưa có ai xin tham gia.</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((r) => (
            <li key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">{r.name}</div>
                  <div className="text-slate-400">
                    {positionLabel(r.position)} · {levelLabel(r.level)} · {r.matches} trận
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="tabular-nums">{r.reputation}</span>
                  <span className="sr-only">điểm uy tín</span>
                </div>
              </div>
              {r.levelWarning && (
                <div className="text-amber-300 text-[0.75rem]">Trình độ thấp hơn yêu cầu (người chơi đã xác nhận)</div>
              )}
              {r.message && <div className="text-slate-300 italic">"{r.message}"</div>}
              {r.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button
                    disabled={busy === r.id || post.status !== 'OPEN'}
                    onClick={() => act(r.id, 'ACCEPTED')}
                    className={primaryBtn + ' flex-1'}
                  >
                    Chấp nhận
                  </button>
                  <button disabled={busy === r.id} onClick={() => act(r.id, 'REJECTED')} className={ghostBtn}>
                    Từ chối
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={r.status} map={REQUEST_STATUS} />
                  <PhoneLine name="SĐT" phone={r.phone} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
