import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HandCoins, Loader2, Plus, Repeat, Trash2, UserCheck } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { Modal } from '../components/ui/Modal';
import { MockTransferButton, TransferQR } from '../components/TransferQR';

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const INPUT =
  'w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500';
const MODES = [
  ['EQUAL', 'Chia đều'],
  ['SPONSOR', 'Đội trưởng tài trợ %'],
  ['CUSTOM', 'Tùy chỉnh từng người'],
];
const SHARE_STATUS = {
  PAID: { text: 'Đã đóng', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  PAID_BY_CAPTAIN: { text: 'Đội trưởng đóng thay', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  UNPAID: { text: 'Chưa đóng', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  REASSIGNED: { text: 'Đã đổi người', cls: 'bg-slate-800 text-slate-400' },
};

// Cùng quy tắc với backend: làm tròn lên hàng nghìn, phần thừa vào quỹ đội
const preview = (mode, total, pct, n) => {
  if (mode === 'CUSTOM' || n === 0) return null;
  const sponsor = mode === 'SPONSOR' ? Math.round((total * pct) / 100) : 0;
  const rest = total - sponsor;
  const per = rest > 0 ? Math.ceil(rest / n / 1000) * 1000 : 0;
  return { sponsor, per, surplus: per * n - rest };
};

export const SplitBillPage = () => {
  const { code } = useParams();
  const { showToast } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    apiClient.splits.get(code).then(
      (r) => {
        setData(r);
        setError(null);
      },
      (err) => setError(errorMessage(err)),
    );

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 10000);
    return () => clearInterval(t);
  }, [code]);

  return (
    <PageLayout
      backTo="/lich-cua-toi"
      backLabel="Về lịch của tôi"
      icon={HandCoins}
      eyebrow="Sổ quỹ đội bóng"
      title="Chia Tiền Trận Đấu"
      description={data ? `${data.booking.venue_name} · ${new Date(data.booking.starts_at).toLocaleString('vi-VN')} · ${code}` : code}
    >
      {error ? (
        <Card>
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      ) : !data ? (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : data.bill ? (
        <BillView data={data} code={code} reload={load} showToast={showToast} />
      ) : data.is_captain ? (
        <CreateForm code={code} onCreated={load} showToast={showToast} />
      ) : (
        <Card>
          <p className="text-sm text-slate-300">Đội trưởng chưa chia tiền cho trận này.</p>
        </Card>
      )}
    </PageLayout>
  );
};

const CreateForm = ({ code, onCreated, showToast }) => {
  const [cand, setCand] = useState(null);
  const [members, setMembers] = useState([]);
  const [mode, setMode] = useState('EQUAL');
  const [pct, setPct] = useState(30);
  const [dueHours, setDueHours] = useState(2);
  const [bank, setBank] = useState({ bank_name: '', bank_account: '', bank_holder: '' });
  const [guest, setGuest] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.splits.candidates(code).then(
      (r) => {
        setCand(r);
        setMembers(r.members.map((m) => ({ ...m, checked: true, amount: '' })));
        if (r.last_bank) setBank(r.last_bank);
      },
      (err) => showToast(errorMessage(err), 'error'),
    );
  }, [code]);

  const chosen = members.filter((m) => m.checked);
  const pv = useMemo(() => cand && preview(mode, cand.total, Number(pct) || 0, chosen.length), [cand, mode, pct, chosen.length]);
  const customSum = chosen.reduce((s, m) => s + (Number(m.amount) || 0), 0);

  if (!cand) return <div className="py-10 text-center text-xs text-slate-400">Đang tải...</div>;

  const addGuest = () => {
    if (!guest.name.trim() || !/^0\d{9}$/.test(guest.phone)) {
      showToast('Nhập tên và SĐT 10 số của người chơi', 'error');
      return;
    }
    if (members.some((m) => m.phone === guest.phone)) {
      showToast('SĐT đã có trong danh sách', 'error');
      return;
    }
    setMembers([...members, { name: guest.name.trim(), phone: guest.phone, source: 'GUEST', checked: true, amount: '' }]);
    setGuest({ name: '', phone: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.splits.create(code, {
        mode,
        sponsor_percent: mode === 'SPONSOR' ? Number(pct) : undefined,
        due_hours_before: Number(dueHours),
        ...bank,
        members: chosen.map((m) => ({ name: m.name, phone: m.phone, amount: mode === 'CUSTOM' ? Number(m.amount) || 0 : undefined })),
      });
      showToast('Đã gửi yêu cầu đóng tiền cho cả đội');
      onCreated();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <h2 className="text-sm font-bold text-white mb-1">Tổng chi phí trận</h2>
          <div className="text-2xl font-black text-emerald-400 tabular-nums">{vnd(cand.total)}</div>
          <p className="text-xs text-slate-400">
            Tiền sân + dịch vụ đặt kèm {vnd(cand.field_and_online_services)}
            {cand.pos_services > 0 && ` · nước/dịch vụ phát sinh tại sân ${vnd(cand.pos_services)}`}
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Người tham gia ({chosen.length})</h2>
          <div className="divide-y divide-slate-800 text-xs">
            {members.map((m, i) => (
              <label key={m.phone} className="py-2 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.checked}
                  onChange={() => setMembers(members.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
                />
                <span className="flex-1 min-w-0">
                  <span className="text-white font-semibold">{m.name}</span>
                  <span className="text-slate-500">
                    {' '}
                    · {m.phone} · {{ CAPTAIN: 'Đội trưởng', TEAM: 'Thành viên đội', FREELANCE: 'Chân lẻ', GUEST: 'Thêm tay' }[m.source]}
                  </span>
                </span>
                {mode === 'CUSTOM' && m.checked && (
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={m.amount}
                    onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    placeholder="Số tiền"
                    className="w-28 h-8 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                  />
                )}
                {m.source === 'GUEST' && (
                  <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-400 cursor-pointer" aria-label="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="Tên người chơi khác" className={INPUT} />
            <input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="SĐT" className={INPUT} />
            <button type="button" onClick={addGuest} className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shrink-0">
              <Plus className="w-3.5 h-3.5" /> Thêm
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Cách chia</h2>
          <div className="space-y-2 text-xs">
            {MODES.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} />
                {label}
              </label>
            ))}
            {mode === 'SPONSOR' && (
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} className={`${INPUT} w-24`} />
                <span className="text-slate-400">% tổng chi phí do đội trưởng trả</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            {pv ? (
              <>
                {pv.sponsor > 0 && <div className="text-slate-400">Đội trưởng tài trợ: {vnd(pv.sponsor)}</div>}
                <div className="text-white font-bold">Mỗi người: {vnd(pv.per)}</div>
                {pv.surplus > 0 && <div className="text-amber-300">Làm tròn lên hàng nghìn · thừa {vnd(pv.surplus)} vào quỹ đội</div>}
              </>
            ) : (
              <div className={customSum === Math.round(cand.total) ? 'text-emerald-400' : 'text-rose-300'}>
                Đã nhập {vnd(customSum)} / {vnd(cand.total)}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Nhận tiền & nhắc nợ</h2>
          <div className="space-y-2">
            <input required value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} placeholder="Ngân hàng (VD: Vietcombank)" className={INPUT} />
            <input required value={bank.bank_account} onChange={(e) => setBank({ ...bank, bank_account: e.target.value.replace(/\D/g, '') })} placeholder="Số tài khoản" className={INPUT} />
            <input required value={bank.bank_holder} onChange={(e) => setBank({ ...bank, bank_holder: e.target.value.toUpperCase() })} placeholder="Chủ tài khoản" className={INPUT} />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              Nhắc người chưa đóng trước giờ bóng lăn
              <input type="number" min="0" max="72" value={dueHours} onChange={(e) => setDueHours(e.target.value)} className={`${INPUT} w-16`} />
              tiếng
            </label>
          </div>
          <button type="submit" disabled={busy || chosen.length === 0} className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer">
            {busy ? 'Đang gửi...' : 'Phát hành yêu cầu đóng tiền'}
          </button>
        </Card>
      </div>
    </form>
  );
};

const BillView = ({ data, code, reload, showToast }) => {
  const { bill, is_captain: isCaptain, my_phone: myPhone } = data;
  const [reassign, setReassign] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(null);
  const active = bill.shares.filter((s) => s.status !== 'REASSIGNED');
  const paid = active.filter((s) => s.status !== 'UNPAID');
  const mine = active.find((s) => s.phone === myPhone && s.status === 'UNPAID');

  const act = async (id, fn, msg) => {
    setBusy(id);
    try {
      await fn();
      showToast(msg);
      await reload();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <div className="text-xs text-slate-400">
              {MODES.find((m) => m[0] === bill.mode)?.[1]}
              {bill.sponsor_percent > 0 && ` ${bill.sponsor_percent}% (${vnd(bill.sponsor_amount)})`}
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{vnd(bill.total_amount)}</div>
          </div>
          <div className="text-right text-xs">
            <div className={bill.status === 'DONE' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {bill.status === 'DONE' ? 'Cả đội đã đóng đủ' : `Đã đóng ${paid.length}/${active.length}`}
            </div>
            <div className="text-slate-500">Hạn nhắc: {new Date(bill.due_at).toLocaleString('vi-VN')}</div>
            {Number(bill.surplus) > 0 && (
              <div className="text-amber-300">
                Thừa {vnd(bill.surplus)} {bill.status === 'DONE' ? 'đã vào' : 'sẽ vào'} quỹ đội
                {bill.team_name && ` ${bill.team_name}`}
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-800 text-xs">
          {bill.shares.map((s) => {
            const st = SHARE_STATUS[s.status];
            return (
              <div key={s.id} className={`py-3 flex flex-col sm:flex-row sm:items-center gap-2 ${s.status === 'REASSIGNED' ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className={`text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                    {s.reminded_at && s.status === 'UNPAID' && <span className="text-[0.75rem] text-amber-400">đã nhắc</span>}
                  </div>
                  <div className="text-slate-500">
                    {s.phone} · <span className="text-white tabular-nums">{vnd(s.amount)}</span>
                  </div>
                </div>
                {isCaptain && s.status === 'UNPAID' && bill.status === 'OPEN' && (
                  <div className="flex flex-wrap gap-1.5">
                    <button disabled={busy === s.id} onClick={() => act(s.id, () => apiClient.splits.markPaid(s.id), `Đã ghi nhận ${s.name} đóng tiền`)} className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1 cursor-pointer">
                      <UserCheck className="w-3.5 h-3.5" /> Đã nhận
                    </button>
                    <button disabled={busy === s.id} onClick={() => act(s.id, () => apiClient.splits.payFor(s.id), `Đã đóng thay ${s.name}`)} className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold cursor-pointer">
                      Đóng thay
                    </button>
                    <button
                      disabled={busy === s.id}
                      onClick={() => {
                        setReassign(s);
                        setForm({ name: '', phone: '' });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" /> Đổi người
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        {mine ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Phần của bạn: {vnd(mine.amount)}</h2>
            <TransferQR
              transfer={{
                bankName: bill.bank_name,
                bankAccount: bill.bank_account,
                bankHolder: bill.bank_holder,
                amount: Number(mine.amount),
                content: `QUY ${code} ${mine.phone}`,
              }}
            />
            <p className="text-xs text-slate-400">Giữ nguyên nội dung, hệ thống tự gạch nợ khi tiền về.</p>
            <MockTransferButton content={`QUY ${code} ${mine.phone}`} amount={Number(mine.amount)} onDone={reload} />
          </div>
        ) : (
          <div className="text-xs text-slate-300 space-y-2">
            <h2 className="text-sm font-bold text-white">Nhận tiền vào</h2>
            <div>
              {bill.bank_name} · {bill.bank_account}
            </div>
            <div>{bill.bank_holder}</div>
            <p className="text-slate-500">
              Mỗi thành viên chuyển khoản với nội dung <b className="text-slate-300">QUY {code} &lt;SĐT&gt;</b>, hệ thống tự cập nhật trạng thái.
            </p>
          </div>
        )}
      </Card>

      {reassign && (
        <Modal icon={Repeat} title="Đổi Người Đóng" description={`${reassign.name} · ${vnd(reassign.amount)}`} onClose={() => setReassign(null)} size="sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await act(reassign.id, () => apiClient.splits.reassign(reassign.id, form), 'Đã chuyển phần đóng tiền');
              setReassign(null);
            }}
            className="space-y-2"
          >
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên người đóng thay" className={INPUT} />
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="SĐT" className={INPUT} />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer">
              Xác nhận
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
