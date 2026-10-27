import React, { useEffect, useState } from 'react';
import { Coffee, LogOut, Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card } from '../components/ui/PageLayout';
import { OwnerPage, OWNER_INPUT, OWNER_PRIMARY_BTN, OWNER_SECONDARY_BTN } from '../components/owner/OwnerPage';
import { CheckoutModal } from '../components/owner/CheckoutModal';

export const SERVICE_CATEGORIES = {
  DRINK: 'Nước giải khát',
  RENTAL: 'Cho thuê (giày, áo bib)',
  BALL: 'Bóng đá',
  REFEREE: 'Trọng tài',
  OTHER: 'Khác',
};

const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const hhmm = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const WALK_IN = '';

export const OwnerServicesPage = () => {
  const { managedPitch } = useApp();
  const [tab, setTab] = useState('pos');

  return (
    <OwnerPage
      icon={Coffee}
      eyebrow="Dịch vụ & Căng-tin"
      description="Bán hàng tại quầy cho từng ô sân, quản lý menu và tồn kho. Doanh thu dịch vụ tách riêng tiền sân."
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto sm:inline-flex">
          {[
            ['pos', 'Bán tại quầy'],
            ['menu', 'Menu & tồn kho'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg cursor-pointer transition-colors ${
                tab === k ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {managedPitch && (tab === 'pos' ? <PosTab venueId={managedPitch.id} /> : <MenuTab venueId={managedPitch.id} />)}
      </div>
    </OwnerPage>
  );
};

const PosTab = ({ venueId }) => {
  const { showToast } = useApp();
  const [board, setBoard] = useState(null);
  const [bookingCode, setBookingCode] = useState(WALK_IN);
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [checkoutCode, setCheckoutCode] = useState(null);

  const load = () =>
    apiClient.pos.board(venueId).then(setBoard, (err) => showToast(errorMessage(err), 'error'));

  useEffect(() => {
    setBoard(null);
    setCart({});
    setBookingCode(WALK_IN);
    load();
  }, [venueId]);

  if (!board) return <div className="py-10 text-center text-xs text-slate-400">Đang tải...</div>;

  const byId = new Map(board.services.map((s) => [String(s.id), s]));
  const cartItems = Object.entries(cart).map(([id, q]) => ({ ...byId.get(id), quantity: q }));
  const total = cartItems.reduce((s, x) => s + Number(x.price) * x.quantity, 0);
  const add = (s, d) =>
    setCart((prev) => {
      const q = Math.max(0, Math.min((prev[s.id] || 0) + d, s.stock ?? 99));
      const next = { ...prev };
      if (q === 0) delete next[s.id];
      else next[s.id] = q;
      return next;
    });
  // Ô sân chưa check-out mới cộng dồn vào tiền sân được
  const openBookings = board.bookings.filter((b) => !b.checked_out_at);
  const selected = board.bookings.find((b) => b.code === bookingCode);

  const pay = async (payMode) => {
    setBusy(true);
    try {
      await apiClient.pos.createOrder(venueId, {
        items: cartItems.map((x) => ({ service_id: x.id, quantity: x.quantity })),
        pay_mode: payMode,
        booking_code: bookingCode || undefined,
      });
      showToast(payMode === 'ADD_TO_BOOKING' ? `Đã cộng ${vnd(total)} vào đơn ${bookingCode}` : `Đã thu ${vnd(total)}`);
      setCart({});
      await load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Ô sân hôm nay</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setBookingCode(WALK_IN)}
              className={`px-3 py-2 rounded-xl border cursor-pointer ${
                bookingCode === WALK_IN ? 'border-amber-500 bg-amber-950/60 text-amber-300' : 'border-slate-700 text-slate-300'
              }`}
            >
              Khách lẻ tại quầy
            </button>
            {board.bookings.map((b) => (
              <div
                key={b.code + b.start_at}
                className={`rounded-xl border flex items-stretch overflow-hidden ${
                  bookingCode === b.code ? 'border-amber-500 bg-amber-950/60' : 'border-slate-700'
                }`}
              >
                <button
                  onClick={() => setBookingCode(b.code)}
                  disabled={!!b.checked_out_at}
                  className="px-3 py-2 text-left cursor-pointer disabled:opacity-50"
                >
                  <div className="font-bold text-white">
                    {b.field_name} · {hhmm(b.start_at)}-{hhmm(b.end_at)}
                  </div>
                  <div className="text-slate-400">{b.customer_name || b.code}</div>
                </button>
                {!b.checked_out_at ? (
                  <button
                    onClick={() => setCheckoutCode(b.code)}
                    title="Hoàn tất đơn / Check-out"
                    className="px-2 border-l border-slate-700 text-slate-400 hover:text-amber-300 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="px-2 flex items-center text-[0.75rem] text-emerald-400 border-l border-slate-700">Đã xong</span>
                )}
              </div>
            ))}
          </div>
          {board.bookings.length === 0 && <p className="text-xs text-slate-500 mt-2">Hôm nay chưa có ô sân nào đã xác nhận.</p>}
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Chọn món</h2>
          {board.services.length === 0 ? (
            <p className="text-xs text-slate-400">Chưa có mặt hàng nào. Thêm ở tab Menu & tồn kho.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {board.services.map((s) => {
                const out = s.stock !== null && s.stock <= 0;
                const q = cart[s.id] || 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => !out && add(s, 1)}
                    disabled={out || (s.stock !== null && q >= s.stock)}
                    className={`relative text-left p-3 rounded-xl border text-xs cursor-pointer disabled:cursor-not-allowed ${
                      out ? 'border-slate-800 bg-slate-950 opacity-60' : q > 0 ? 'border-amber-500 bg-amber-950/40' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-semibold text-white line-clamp-2">{s.name}</div>
                    <div className="text-amber-400 font-bold tabular-nums mt-1">{vnd(s.price)}</div>
                    <div className={`mt-1 text-[0.75rem] ${out ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                      {out ? 'Hết hàng' : s.stock === null ? 'Không giới hạn' : `Còn ${s.stock}`}
                    </div>
                    {q > 0 && (
                      <span className="absolute top-2 right-2 px-1.5 rounded-full bg-amber-500 text-slate-950 font-bold">{q}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            Đơn tại quầy
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            {selected ? `${selected.field_name} · ${selected.customer_name || selected.code}` : 'Khách lẻ'}
          </p>
          {cartItems.length === 0 ? (
            <p className="text-xs text-slate-500">Bấm món bên trái để thêm.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {cartItems.map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300 min-w-0 truncate">{x.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => add(x, -1)} aria-label="Bớt" className="p-1 rounded bg-slate-800 text-white cursor-pointer">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center tabular-nums text-white">{x.quantity}</span>
                    <button onClick={() => add(x, 1)} aria-label="Thêm" className="p-1 rounded bg-slate-800 text-white cursor-pointer">
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="w-16 text-right tabular-nums text-white">{vnd(x.price * x.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                <span>Tổng</span>
                <span className="text-amber-400 tabular-nums">{vnd(total)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button disabled={busy || !total} onClick={() => pay('CASH')} className={OWNER_PRIMARY_BTN}>
              Tiền mặt
            </button>
            <button disabled={busy || !total} onClick={() => pay('QR')} className={OWNER_PRIMARY_BTN}>
              Quét QR
            </button>
            <button
              disabled={busy || !total || !selected || !!selected.checked_out_at}
              onClick={() => pay('ADD_TO_BOOKING')}
              className={`col-span-2 ${OWNER_SECONDARY_BTN} disabled:opacity-50`}
            >
              Cộng vào tiền sân
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-white mb-3">Đã bán hôm nay ({board.orders.length})</h2>
          {board.orders.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có đơn nào.</p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs">
              {board.orders.map((o) => (
                <div key={o.id} className="py-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {hhmm(o.created_at)} · {o.booking_code || 'Khách lẻ'}
                    </span>
                    <span className="font-bold text-white tabular-nums">{vnd(o.total)}</span>
                  </div>
                  <div className="text-slate-500">
                    {(o.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', ')} ·{' '}
                    {o.pay_mode === 'ADD_TO_BOOKING' ? (o.paid_at ? 'đã thu khi check-out' : 'cộng tiền sân') : o.pay_mode === 'QR' ? 'QR' : 'tiền mặt'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {checkoutCode && <CheckoutModal code={checkoutCode} onClose={() => setCheckoutCode(null)} onDone={load} />}
    </div>
  );
};

const EMPTY = { name: '', price: '', category: 'DRINK', stock: '' };

const MenuTab = ({ venueId }) => {
  const { showToast } = useApp();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [edits, setEdits] = useState({});

  const load = () => apiClient.pos.services(venueId).then((r) => setItems(r.data), (err) => showToast(errorMessage(err), 'error'));
  useEffect(() => {
    setItems(null);
    load();
  }, [venueId]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await apiClient.pos.createService(venueId, { ...form, stock: form.stock === '' ? null : Number(form.stock) });
      setForm(EMPTY);
      showToast('Đã thêm mặt hàng');
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const save = async (item, patch) => {
    try {
      await apiClient.pos.updateService(item.id, patch);
      setEdits((p) => ({ ...p, [item.id]: undefined }));
      load();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-amber-400" />
          Thêm mặt hàng
        </h2>
        <form onSubmit={create} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên (VD: Nước suối)" maxLength={120} className={`col-span-2 ${OWNER_INPUT}`} />
          <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Đơn giá" className={OWNER_INPUT} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={OWNER_INPUT}>
            {Object.entries(SERVICE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Tồn kho (trống = không giới hạn)" className={OWNER_INPUT} />
          <button type="submit" className={`col-span-2 sm:col-span-5 ${OWNER_PRIMARY_BTN}`}>
            Thêm vào menu
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-amber-400" />
          Menu & tồn kho
        </h2>
        {!items ? (
          <p className="text-xs text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có mặt hàng.</p>
        ) : (
          <div className="divide-y divide-slate-800 text-xs">
            {items.map((it) => {
              const ed = edits[it.id];
              const out = it.stock !== null && it.stock <= 0;
              return (
                <div key={it.id} className={`py-3 flex flex-col sm:flex-row sm:items-center gap-2 ${it.is_active ? '' : 'opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">
                      {it.name}
                      {out && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 text-[0.75rem]">Hết hàng</span>}
                      {!it.is_active && <span className="ml-2 text-slate-500">(đã ẩn)</span>}
                    </div>
                    <div className="text-slate-500">
                      {SERVICE_CATEGORIES[it.category]} · {vnd(it.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Kho:</span>
                    <input
                      type="number"
                      min="0"
                      value={ed?.stock ?? (it.stock ?? '')}
                      placeholder="∞"
                      onChange={(e) => setEdits((p) => ({ ...p, [it.id]: { stock: e.target.value } }))}
                      className="w-20 h-9 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white"
                    />
                    {ed && (
                      <button
                        onClick={() => save(it, { stock: ed.stock === '' ? null : Number(ed.stock) })}
                        className="px-3 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                      >
                        Lưu
                      </button>
                    )}
                    <button
                      onClick={() => save(it, { is_active: !it.is_active })}
                      title={it.is_active ? 'Ẩn khỏi menu' : 'Bán lại'}
                      className="h-9 px-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    >
                      {it.is_active ? <Trash2 className="w-4 h-4" /> : 'Bán lại'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
