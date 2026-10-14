import React, { useEffect, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { AlertCircle, CheckCircle2, Copy, Loader2 } from 'lucide-react';

// img.vietqr.io nhận mã ngân hàng dạng tên viết liền (vietcombank, techcombank...)
const vietQrUrl = (t) =>
  t.bankName && t.bankAccount
    ? `https://img.vietqr.io/image/${encodeURIComponent(t.bankName.toLowerCase().replace(/\s+/g, ''))}-${encodeURIComponent(
        t.bankAccount,
      )}-compact2.png?amount=${t.amount}&addInfo=${encodeURIComponent(t.content)}&accountName=${encodeURIComponent(
        t.bankHolder || '',
      )}`
    : null;

export const PaymentPanel = ({ bookingCode, onReported }) => {
  const { getTransferInfo, reportTransfer, showToast } = useApp();
  const [info, setInfo] = useState(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    getTransferInfo(bookingCode)
      .then(setInfo)
      .catch((err) => setError(errorMessage(err)));
  }, [bookingCode]);

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(
      () => showToast('Đã sao chép'),
      () => undefined,
    );
  };

  const handleReport = async () => {
    setSending(true);
    setError(null);
    try {
      await reportTransfer(bookingCode);
      setReported(true);
      onReported?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (!info && !error) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang tải thông tin chuyển khoản...</span>
      </div>
    );
  }

  const qr = info ? vietQrUrl(info) : null;

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-800/70 space-y-3 text-xs text-left">
      <div className="font-bold text-white text-sm">Chuyển khoản tiền cọc</div>

      {info && (
        <div className="flex flex-col sm:flex-row gap-4">
          {qr && !qrFailed && (
            <img
              src={qr}
              alt="Mã VietQR chuyển khoản tiền cọc"
              onError={() => setQrFailed(true)}
              className="w-44 h-44 rounded-xl bg-white p-1.5 object-contain mx-auto sm:mx-0 shrink-0"
            />
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <Row label="Ngân hàng" value={info.bankName || 'Chủ sân chưa cấu hình'} />
            <Row
              label="Số tài khoản"
              value={info.bankAccount || '—'}
              onCopy={info.bankAccount ? () => copy(info.bankAccount) : undefined}
            />
            <Row label="Chủ tài khoản" value={info.bankHolder || '—'} />
            <Row label="Số tiền" value={`${info.amount.toLocaleString('vi-VN')}đ`} highlight />
            <Row label="Nội dung" value={info.content} onCopy={() => copy(info.content)} />
          </div>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {reported ? (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Đã báo chuyển khoản. Đơn chờ chủ sân xác nhận.</span>
        </div>
      ) : (
        info && (
          <button
            onClick={handleReport}
            disabled={sending}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {sending ? 'Đang gửi...' : 'Tôi đã chuyển khoản'}
          </button>
        )
      )}
    </div>
  );
};

const Row = ({ label, value, highlight, onCopy }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-400 shrink-0">{label}:</span>
    <span
      className={`font-bold text-right break-all flex items-center gap-1 ${highlight ? 'text-emerald-400' : 'text-white'}`}
    >
      {value}
      {onCopy && (
        <button onClick={onCopy} title="Sao chép" className="text-slate-400 hover:text-white cursor-pointer">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  </div>
);
