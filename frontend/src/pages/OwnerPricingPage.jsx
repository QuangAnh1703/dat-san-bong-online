import React, { useEffect, useState } from 'react';
import { Sliders, Zap, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { minutesToHHMM } from '../services/mappers';
import { Card } from '../components/ui/PageLayout';
import { OwnerPage, OWNER_INPUT, OWNER_PRIMARY_BTN, OWNER_SECONDARY_BTN } from '../components/owner/OwnerPage';

const DAY_TYPE = { WEEKEND: 'Cuối tuần', HOLIDAY: 'Ngày lễ' };

const toRow = (r) => ({
  id: String(r.id),
  label: r.label || '',
  fieldType: String(r.field_type).replace('F', 'Sân '),
  dayType: DAY_TYPE[r.day_type] || 'Ngày thường',
  from: String(r.from_time).slice(0, 5),
  to: String(r.to_time).slice(0, 5),
  basePrice: Number(r.base_price),
  multiplier: Number(r.multiplier),
});

const EMPTY_RULE = {
  field_type: 'F7',
  day_type: 'WEEKDAY',
  from_time: '17:00',
  to_time: '22:00',
  base_price: 300000,
  multiplier: 1,
  label: '',
};

const NUM_INPUT =
  'w-full h-9 px-2 rounded-lg border border-slate-700 bg-slate-800 text-white tabular-nums focus:outline-none focus:border-amber-500';

export const OwnerPricingPage = () => {
  const { managedPitch, reloadPitches, showToast } = useApp();
  const pitchId = managedPitch?.id;

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const [flash, setFlash] = useState({ is_active: false, discount_percent: 30, trigger_hours_before: 3 });
  const [savingFlash, setSavingFlash] = useState(false);

  const loadRows = async () => {
    setRowsLoading(true);
    try {
      const res = await apiClient.pricing.list(pitchId);
      setRows((res.data || []).map(toRow));
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    if (!pitchId) return;
    loadRows();
    apiClient.owner
      .getFlashSale(pitchId)
      .then((res) => {
        const f = res.flash_sale;
        setFlash(
          f
            ? {
                is_active: f.is_active,
                discount_percent: f.discount_percent,
                trigger_hours_before: f.trigger_hours_before,
              }
            : { is_active: false, discount_percent: 30, trigger_hours_before: 3 },
        );
      })
      .catch((err) => showToast(errorMessage(err), 'error'));
  }, [pitchId]);

  const updateRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)));
  const dirtyCount = rows.filter((r) => r.dirty).length;

  const handleSavePricing = async (e) => {
    e.preventDefault();
    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) return;
    setSavingPrice(true);
    try {
      for (const r of dirty) {
        await apiClient.pricing.update(pitchId, r.id, { base_price: r.basePrice, multiplier: r.multiplier });
      }
      showToast(`Đã lưu ${dirty.length} khung giá`);
      await Promise.all([loadRows(), reloadPitches()]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  const setRule = (key) => (e) => setNewRule((r) => ({ ...r, [key]: e.target.value }));

  const handleAddRule = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (newRule.from_time >= newRule.to_time) {
      setAddError('Giờ bắt đầu phải trước giờ kết thúc.');
      return;
    }
    setAdding(true);
    try {
      await apiClient.pricing.create(pitchId, {
        ...newRule,
        base_price: Number(newRule.base_price),
        multiplier: Number(newRule.multiplier),
        label: newRule.label.trim() || undefined,
      });
      showToast('Đã thêm khung giá');
      setNewRule(EMPTY_RULE);
      await Promise.all([loadRows(), reloadPitches()]);
    } catch (err) {
      // PRICE_SLOT_OVERLAP: "Khung giờ cài đặt giá bị chồng lấp (HH:MM-HH:MM)..."
      setAddError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRule = async (r) => {
    if (!window.confirm(`Xóa khung giá ${r.fieldType} · ${r.dayType} · ${r.from}-${r.to}?`)) return;
    try {
      await apiClient.pricing.remove(pitchId, r.id);
      showToast('Đã xóa khung giá');
      await Promise.all([loadRows(), reloadPitches()]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const handleSaveFlash = async (e) => {
    e.preventDefault();
    setSavingFlash(true);
    try {
      await apiClient.owner.saveFlashSale(pitchId, flash);
      showToast(flash.is_active ? 'Đã bật Flash Sale giờ vắng' : 'Đã tắt Flash Sale');
      await reloadPitches();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setSavingFlash(false);
    }
  };

  return (
    <OwnerPage
      icon={Sliders}
      eyebrow="Bảng giá & khuyến mãi"
      description="Giá gốc theo khung giờ, hệ số giờ cao điểm và Flash Sale tự động cho giờ vắng."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSavePricing} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Bảng giá theo khung giờ</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Giá 1 trận 90 phút = giá gốc/giờ × hệ số × 1,5.</p>
              </div>
            </div>

            {rowsLoading && rows.length === 0 ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải bảng giá...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Chưa có khung giá nào.</div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl bg-slate-950 border grid grid-cols-2 sm:grid-cols-4 gap-2 items-end text-xs ${
                      r.dirty ? 'border-amber-700' : 'border-slate-800'
                    }`}
                  >
                    <div className="col-span-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white">
                          {r.fieldType} · {r.dayType}
                        </div>
                        <div className="text-slate-400 tabular-nums">
                          {r.from} - {r.to}
                          {r.label && ` · ${r.label}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(r)}
                        aria-label="Xóa khung giá"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <label className="block">
                      <span className="text-[0.8125rem] text-slate-400">Giá gốc/giờ</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={r.basePrice}
                        onChange={(e) => updateRow(r.id, { basePrice: Math.max(1000, parseInt(e.target.value) || 0) })}
                        className={NUM_INPUT}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[0.8125rem] text-slate-400">Hệ số</span>
                      <input
                        type="number"
                        min={0.1}
                        max={5}
                        step={0.05}
                        value={r.multiplier}
                        onChange={(e) =>
                          updateRow(r.id, { multiplier: Math.min(5, Math.max(0.1, parseFloat(e.target.value) || 1)) })
                        }
                        className={NUM_INPUT}
                      />
                    </label>
                    <div className="col-span-2 sm:col-span-4 text-[0.8125rem] text-emerald-400 text-right tabular-nums">
                      = {Math.round(r.basePrice * r.multiplier * 1.5).toLocaleString('vi-VN')}đ / trận 90 phút
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              {dirtyCount > 0 && (
                <button type="button" onClick={loadRows} className={OWNER_SECONDARY_BTN}>
                  Hoàn tác
                </button>
              )}
              <button type="submit" disabled={savingPrice || dirtyCount === 0} className={OWNER_PRIMARY_BTN}>
                {savingPrice ? 'Đang lưu...' : dirtyCount > 0 ? `Lưu ${dirtyCount} thay đổi` : 'Lưu bảng giá'}
              </button>
            </div>
          </form>

          <form onSubmit={handleAddRule} className="mt-6 pt-5 border-t border-slate-800 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Thêm khung giá</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Loại sân</span>
                <select value={newRule.field_type} onChange={setRule('field_type')} className={NUM_INPUT}>
                  <option value="F5">Sân 5</option>
                  <option value="F7">Sân 7</option>
                  <option value="F11">Sân 11</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Loại ngày</span>
                <select value={newRule.day_type} onChange={setRule('day_type')} className={NUM_INPUT}>
                  <option value="WEEKDAY">Ngày thường</option>
                  <option value="WEEKEND">Cuối tuần</option>
                  <option value="HOLIDAY">Ngày lễ</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Từ giờ</span>
                <input type="time" value={newRule.from_time} onChange={setRule('from_time')} className={NUM_INPUT} />
              </label>
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Đến giờ</span>
                <input type="time" value={newRule.to_time} onChange={setRule('to_time')} className={NUM_INPUT} />
              </label>
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Giá gốc/giờ</span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={newRule.base_price}
                  onChange={setRule('base_price')}
                  className={NUM_INPUT}
                />
              </label>
              <label className="block">
                <span className="text-[0.8125rem] text-slate-400">Hệ số</span>
                <input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.05}
                  value={newRule.multiplier}
                  onChange={setRule('multiplier')}
                  className={NUM_INPUT}
                />
              </label>
              <label className="block col-span-2">
                <span className="text-[0.8125rem] text-slate-400">Nhãn (tuỳ chọn)</span>
                <input
                  value={newRule.label}
                  onChange={setRule('label')}
                  maxLength={50}
                  placeholder="VD Giờ vàng"
                  className={NUM_INPUT}
                />
              </label>
            </div>
            {addError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{addError}</span>
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={adding} className={OWNER_PRIMARY_BTN}>
                {adding ? 'Đang thêm...' : 'Thêm khung giá'}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleSaveFlash} className="space-y-4 text-xs">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Flash Sale giờ vắng</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự giảm giá slot còn trống khi sắp tới giờ đá, hiển thị ở mục “Kèo gấp giá hời” của người chơi.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flash.is_active}
                onChange={(e) => setFlash({ ...flash, is_active: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-slate-200 font-semibold">Bật Flash Sale cho cụm sân này</span>
            </label>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Mức giảm giá (%)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={flash.discount_percent}
                onChange={(e) =>
                  setFlash({ ...flash, discount_percent: Math.min(90, Math.max(1, parseInt(e.target.value) || 1)) })
                }
                className={OWNER_INPUT}
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Áp dụng khi còn tối đa (giờ) trước giờ đá</label>
              <input
                type="number"
                min={1}
                max={48}
                value={flash.trigger_hours_before}
                onChange={(e) =>
                  setFlash({
                    ...flash,
                    trigger_hours_before: Math.min(48, Math.max(1, parseInt(e.target.value) || 1)),
                  })
                }
                className={OWNER_INPUT}
              />
            </div>
            {managedPitch?.flashSale?.timeSpans && (
              <p className="text-[0.8125rem] text-slate-500">
                Chỉ áp dụng trong các khung:{' '}
                {managedPitch.flashSale.timeSpans
                  .map((t) => `${minutesToHHMM(t.fromMinute)}-${minutesToHHMM(t.toMinute)}`)
                  .join(', ')}
              </p>
            )}
            <button type="submit" disabled={savingFlash} className={`w-full ${OWNER_PRIMARY_BTN}`}>
              {savingFlash ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </form>
        </Card>
      </div>
    </OwnerPage>
  );
};
