import React, { useState } from 'react';
import { FileText, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageLayout } from '../components/ui/PageLayout';
import { AdminCard, EmptyNote, ReasonModal, useAdminRun } from '../components/admin/AdminShared';

export const AdminOwnerRequestsPage = () => {
  const { ownerApplications, approveApplication, rejectApplication } = useApp();
  const { busyId, run } = useAdminRun();
  const [rejecting, setRejecting] = useState(null);

  return (
    <PageLayout
      tone="cyan"
      icon={FileText}
      eyebrow="Quản trị hệ thống"
      title="Duyệt Yêu Cầu Chủ Sân"
      description="Người chơi xin nâng cấp tài khoản lên chủ sân để đăng cụm sân của mình."
    >
      <AdminCard title={`Đang chờ duyệt (${ownerApplications.length})`} icon={FileText}>
        {ownerApplications.length === 0 ? (
          <EmptyNote>Không có yêu cầu nào đang chờ duyệt.</EmptyNote>
        ) : (
          <div className="divide-y divide-slate-800">
            {ownerApplications.map((app) => (
              <div key={app.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{app.facilityName}</span>
                    <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                      Chờ duyệt
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {app.phone || '—'} · {app.address || '—'}
                    {app.district && ` · ${app.district}`}
                  </div>
                  <div className="text-[0.8125rem] text-slate-500 font-mono">Gửi lúc: {app.submittedAt}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busyId === app.id}
                    onClick={() => run(app.id, () => approveApplication(app.id))}
                    className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Phê duyệt</span>
                  </button>
                  <button
                    disabled={busyId === app.id}
                    onClick={() => setRejecting(app)}
                    className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-rose-400 border border-rose-900 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {rejecting && (
        <ReasonModal
          title="Từ chối yêu cầu chủ sân"
          description={rejecting.facilityName}
          label="Lý do từ chối (gửi cho người yêu cầu):"
          confirmText="Từ chối yêu cầu"
          danger
          onSubmit={(reason) => run(rejecting.id, () => rejectApplication(rejecting.id, reason))}
          onClose={() => setRejecting(null)}
        />
      )}
    </PageLayout>
  );
};
