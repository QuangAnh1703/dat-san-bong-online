import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Pencil, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { OWNER_PRIMARY_BTN } from '../components/owner/OwnerPage';

export const VENUE_STATUS = {
  PENDING: { text: 'Chờ Admin duyệt', cls: 'bg-violet-950 text-violet-300 border border-violet-800' },
  APPROVED: { text: 'Đang hoạt động', cls: 'bg-emerald-950 text-emerald-400 border border-emerald-800' },
  REJECTED: { text: 'Bị từ chối', cls: 'bg-rose-950 text-rose-400 border border-rose-800' },
  SUSPENDED: { text: 'Tạm ngưng', cls: 'bg-slate-800 text-slate-400' },
  DRAFT: { text: 'Bản nháp', cls: 'bg-slate-800 text-slate-400' },
};

const FIELD_LABEL = { F5: 'Sân 5', F7: 'Sân 7', F11: 'Sân 11' };

// Mọi cụm sân của chủ sân ở mọi trạng thái (trang Tổng quan chỉ thấy cụm sân đã duyệt)
export const OwnerVenuesPage = () => {
  const { showToast } = useApp();
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.owner
      .getVenues()
      .then((res) => setVenues(res.data || []))
      .catch((err) => {
        setError(errorMessage(err));
        showToast(`Không tải được cụm sân: ${errorMessage(err)}`, 'error');
      });
  }, []);

  return (
    <PageLayout
      tone="amber"
      icon={Building2}
      eyebrow="Góc Chủ Sân"
      title="Cụm sân của tôi"
      description="Đăng ký cụm sân mới, theo dõi trạng thái duyệt và cập nhật hồ sơ khi bị từ chối."
      actions={
        <Link to="/chu-san/cum-san/moi" className={`${OWNER_PRIMARY_BTN} inline-flex items-center gap-1.5`}>
          <Plus className="w-4 h-4" />
          <span>Đăng ký cụm sân</span>
        </Link>
      }
    >
      {venues === null && !error ? (
        <div className="py-16 flex justify-center text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : error ? (
        <Card className="text-center text-xs text-rose-300">{error}</Card>
      ) : venues.length === 0 ? (
        <Card className="py-14 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-white">Bạn chưa đăng ký cụm sân nào</p>
          <p className="text-xs text-slate-400">Khai báo thông tin, sân con và tài khoản nhận cọc rồi gửi Admin duyệt.</p>
          <Link to="/chu-san/cum-san/moi" className={`${OWNER_PRIMARY_BTN} inline-flex`}>
            Đăng ký cụm sân đầu tiên
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {venues.map((v) => {
            const st = VENUE_STATUS[v.status] || { text: v.status, cls: 'bg-slate-800 text-slate-300' };
            return (
              <Card key={v.id} className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white truncate">{v.name}</h2>
                    <p className="text-slate-400 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 mt-px shrink-0" />
                      <span>
                        {v.address}, {v.district_name}
                      </span>
                    </p>
                  </div>
                  <span className={`shrink-0 text-[0.75rem] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {v.fields.length === 0 ? (
                    <span className="text-slate-500">Chưa có sân con</span>
                  ) : (
                    v.fields.map((f) => (
                      <span
                        key={f.id}
                        className={`px-2 py-0.5 rounded-lg border ${
                          f.is_active ? 'border-slate-700 text-slate-300' : 'border-slate-800 text-slate-600 line-through'
                        }`}
                      >
                        {f.name} · {FIELD_LABEL[f.type]}
                      </span>
                    ))
                  )}
                </div>

                {v.status === 'REJECTED' && v.reject_reason && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                    <span>
                      <b>Lý do từ chối:</b> {v.reject_reason}
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Link
                    to={`/chu-san/cum-san/${v.id}`}
                    className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{v.status === 'REJECTED' ? 'Sửa & gửi duyệt lại' : 'Sửa thông tin'}</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};
