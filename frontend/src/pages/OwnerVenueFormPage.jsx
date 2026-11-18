import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Plus, Trash2, AlertCircle, Loader2, LocateFixed } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { OWNER_INPUT, OWNER_PRIMARY_BTN, OWNER_SECONDARY_BTN } from '../components/owner/OwnerPage';

const labelCls = 'text-xs text-slate-300 font-semibold block mb-1.5';
// Ô trong một hàng flex: bỏ w-full của OWNER_INPUT để flex-1 / độ rộng cố định có tác dụng
const ROW_INPUT = OWNER_INPUT.replace('w-full ', '');
const FIELD_TYPES = [
  { value: 'F5', label: 'Sân 5' },
  { value: 'F7', label: 'Sân 7' },
  { value: 'F11', label: 'Sân 11' },
];

const EMPTY = {
  name: '',
  phone: '',
  address: '',
  districtCode: '',
  openTime: '06:00',
  closeTime: '23:00',
  depositPercent: 30,
  description: '',
  amenities: [],
  bankName: '',
  bankAccount: '',
  bankHolder: '',
  latitude: '',
  longitude: '',
};

const fromApi = (v) => ({
  name: v.name || '',
  phone: v.phone || '',
  address: v.address || '',
  districtCode: v.district_code || '',
  openTime: (v.open_time || '06:00').slice(0, 5),
  closeTime: (v.close_time || '23:00').slice(0, 5),
  depositPercent: Math.round(Number(v.deposit_rate ?? 0.3) * 100),
  description: v.description || '',
  amenities: v.amenities || [],
  bankName: v.bank_name || '',
  bankAccount: v.bank_account || '',
  bankHolder: v.bank_holder || '',
  latitude: v.latitude ?? '',
  longitude: v.longitude ?? '',
});

const Section = ({ title, hint, children }) => (
  <Card className="space-y-4">
    <div>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
    {children}
  </Card>
);

// Đăng ký cụm sân mới (/chu-san/cum-san/moi) hoặc sửa cụm sân (/chu-san/cum-san/:id).
// Cụm sân bị từ chối được sửa sẽ tự gửi duyệt lại.
export const OwnerVenueFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { districts, showToast, reloadPitches } = useApp();

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const [existingFields, setExistingFields] = useState([]);
  const [newFields, setNewFields] = useState(isEdit ? [] : [{ name: 'Sân 1', type: 'F7' }]);
  const [amenityOptions, setAmenityOptions] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  useEffect(() => {
    apiClient
      .getAmenities()
      .then((res) => setAmenityOptions((res.data || []).map((a) => ({ value: a.code, label: a.name }))))
      .catch(() => setAmenityOptions([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiClient.owner
      .getVenues()
      .then((res) => {
        const v = (res.data || []).find((x) => String(x.id) === id);
        if (!v) throw new Error('Không tìm thấy cụm sân hoặc bạn không có quyền sửa.');
        setForm(fromApi(v));
        setStatus(v.status);
        setExistingFields(v.fields || []);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const locate = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        })),
      () => showToast('Không lấy được vị trí. Hãy cho phép truy cập vị trí trong trình duyệt.', 'error'),
    );
  };

  const removeExistingField = async (field) => {
    if (!window.confirm(`Xóa sân con "${field.name}"?`)) return;
    try {
      await apiClient.fields.delete(field.id);
      setExistingFields((list) => list.filter((f) => f.id !== field.id));
    } catch (err) {
      showToast(`Không xóa được sân con: ${errorMessage(err)}`, 'error');
    }
  };

  const validate = () => {
    if (!/^0[0-9]{9}$/.test(form.phone)) return 'Số điện thoại cụm sân phải gồm đúng 10 chữ số.';
    if (!form.districtCode) return 'Vui lòng chọn Quận/Huyện.';
    if (form.openTime >= form.closeTime) return 'Giờ mở cửa phải trước giờ đóng cửa.';
    if (existingFields.length + newFields.length === 0) return 'Cụm sân cần ít nhất một sân con.';
    const names = [...existingFields, ...newFields].map((f) => f.name.trim().toLowerCase());
    if (names.some((n) => !n)) return 'Tên sân con không được để trống.';
    if (new Set(names).size !== names.length) return 'Tên các sân con không được trùng nhau.';
    if (!form.bankName.trim() || !/^[0-9]{6,20}$/.test(form.bankAccount) || !form.bankHolder.trim()) {
      return 'Cần đủ thông tin tài khoản nhận cọc (ngân hàng, số tài khoản 6-20 chữ số, chủ tài khoản).';
    }
    if ((form.latitude === '') !== (form.longitude === '')) return 'Cần nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validate();
    setError(invalid);
    if (invalid) return;

    const body = {
      name: form.name.trim(),
      phone: form.phone,
      address: form.address.trim(),
      district_code: form.districtCode,
      open_time: form.openTime,
      close_time: form.closeTime,
      deposit_rate: Number(form.depositPercent) / 100,
      description: form.description.trim(),
      amenities: form.amenities,
      bank_name: form.bankName.trim(),
      bank_account: form.bankAccount,
      bank_holder: form.bankHolder.trim().toUpperCase(),
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await apiClient.venues.update(id, body);
        for (const f of newFields) {
          await apiClient.fields.create({ venue_id: Number(id), name: f.name.trim(), type: f.type });
        }
        showToast(status === 'REJECTED' ? 'Đã cập nhật và gửi duyệt lại cụm sân.' : 'Đã cập nhật thông tin cụm sân.');
      } else {
        await apiClient.venues.create({ ...body, fields: newFields.map((f) => ({ ...f, name: f.name.trim() })) });
        showToast('Đã gửi hồ sơ cụm sân. Admin sẽ duyệt và thông báo cho bạn.');
      }
      reloadPitches();
      navigate('/chu-san/cum-san');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      tone="amber"
      backTo="/chu-san/cum-san"
      backLabel="Về Cụm sân của tôi"
      icon={Building2}
      eyebrow="Góc Chủ Sân"
      title={isEdit ? 'Sửa thông tin cụm sân' : 'Đăng ký cụm sân mới'}
      description={
        isEdit && status === 'REJECTED'
          ? 'Cụm sân đã bị từ chối. Sửa theo lý do Admin đưa ra, bấm lưu để gửi duyệt lại.'
          : 'Hồ sơ được gửi Admin duyệt; sau khi duyệt cụm sân mới hiển thị cho người chơi.'
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : (
        <form onSubmit={submit} className="max-w-3xl mx-auto space-y-5 text-xs">
          <Section title="Thông tin cụm sân">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Tên cụm sân *</label>
                <input value={form.name} onChange={set('name')} maxLength={150} required className={OWNER_INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Địa chỉ *</label>
                <input
                  value={form.address}
                  onChange={set('address')}
                  maxLength={300}
                  required
                  placeholder="Số nhà, đường, phường"
                  className={OWNER_INPUT}
                />
              </div>
              <div>
                <label className={labelCls}>Quận/Huyện *</label>
                <select value={form.districtCode} onChange={set('districtCode')} required className={OWNER_INPUT}>
                  <option value="">-- Chọn --</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Số điện thoại cụm sân *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => set('phone')(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0912345678"
                  required
                  className={OWNER_INPUT}
                />
              </div>
              <div>
                <label className={labelCls}>Giờ mở cửa</label>
                <input type="time" value={form.openTime} onChange={set('openTime')} className={OWNER_INPUT} />
              </div>
              <div>
                <label className={labelCls}>Giờ đóng cửa</label>
                <input type="time" value={form.closeTime} onChange={set('closeTime')} className={OWNER_INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={3}
                  placeholder="Mặt cỏ, chỗ để xe, lưu ý cho khách..."
                  className={`${OWNER_INPUT} h-auto py-2`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Vị trí trên bản đồ (để người chơi tìm sân gần nhất)</label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={set('latitude')}
                  placeholder="Vĩ độ, VD 21.028511"
                  className={OWNER_INPUT}
                />
                <input
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={set('longitude')}
                  placeholder="Kinh độ, VD 105.804817"
                  className={OWNER_INPUT}
                />
                <button type="button" onClick={locate} className={`${OWNER_SECONDARY_BTN} inline-flex items-center justify-center gap-1.5`}>
                  <LocateFixed className="w-4 h-4" />
                  <span>Vị trí hiện tại</span>
                </button>
              </div>
            </div>
          </Section>

          <Section title="Tiện ích">
            {amenityOptions.length ? (
              <ChoiceChips tone="amber" options={amenityOptions} value={form.amenities} onChange={set('amenities')} />
            ) : (
              <p className="text-slate-500">Không tải được danh mục tiện ích.</p>
            )}
          </Section>

          <Section title="Sân con *" hint="Khai báo các sân trong cụm (sân 5, 7 hoặc 11 người).">
            <div className="space-y-2">
              {existingFields.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 flex items-center justify-between">
                    <span className="truncate">{f.name}</span>
                    <span className="text-slate-500">{FIELD_TYPES.find((t) => t.value === f.type)?.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingField(f)}
                    aria-label={`Xóa ${f.name}`}
                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {newFields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={f.name}
                    onChange={(e) =>
                      setNewFields((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                    maxLength={50}
                    placeholder="Tên sân, VD Sân 7 - A"
                    className={`${ROW_INPUT} flex-1 min-w-0`}
                  />
                  <select
                    value={f.type}
                    onChange={(e) =>
                      setNewFields((list) => list.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))
                    }
                    className={`${ROW_INPUT} w-24 shrink-0`}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewFields((list) => list.filter((_, j) => j !== i))}
                    aria-label="Bỏ sân con này"
                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setNewFields((list) => [
                    ...list,
                    { name: `Sân ${existingFields.length + list.length + 1}`, type: 'F7' },
                  ])
                }
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer pt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm sân con</span>
              </button>
            </div>
          </Section>

          <Section
            title="Đặt cọc & tài khoản nhận cọc *"
            hint="Tài khoản nhận tiền của cụm sân (tiền cọc người chơi thanh toán qua SePay)."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tỷ lệ đặt cọc (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={form.depositPercent}
                  onChange={set('depositPercent')}
                  className={OWNER_INPUT}
                />
              </div>
              <div>
                <label className={labelCls}>Ngân hàng</label>
                <input
                  value={form.bankName}
                  onChange={set('bankName')}
                  placeholder="VD Vietcombank"
                  maxLength={100}
                  className={OWNER_INPUT}
                />
              </div>
              <div>
                <label className={labelCls}>Số tài khoản</label>
                <input
                  inputMode="numeric"
                  value={form.bankAccount}
                  onChange={(e) => set('bankAccount')(e.target.value.replace(/\D/g, '').slice(0, 20))}
                  className={OWNER_INPUT}
                />
              </div>
              <div>
                <label className={labelCls}>Chủ tài khoản</label>
                <input
                  value={form.bankHolder}
                  onChange={set('bankHolder')}
                  placeholder="NGUYEN VAN A"
                  maxLength={150}
                  className={`${OWNER_INPUT} uppercase`}
                />
              </div>
            </div>
          </Section>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => navigate('/chu-san/cum-san')} className={OWNER_SECONDARY_BTN}>
              Hủy
            </button>
            <button type="submit" disabled={saving} className={OWNER_PRIMARY_BTN}>
              {saving
                ? 'Đang lưu...'
                : !isEdit
                  ? 'Gửi Admin duyệt'
                  : status === 'REJECTED'
                    ? 'Lưu & gửi duyệt lại'
                    : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      )}
    </PageLayout>
  );
};
