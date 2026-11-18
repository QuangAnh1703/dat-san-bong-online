import React, { useEffect, useRef, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Copy, Loader2 } from 'lucide-react';

const POLL_MS = 4000;
const vnd = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;
const hhmm = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// Quét VietQR chuyển vào tài khoản liên kết SePay; SePay báo webhook khi tiền về -> đơn tự xác nhận
export const PaymentPanel = ({ bookingCode, onReported }) => {
  const { reloadBookings, showToast } = useApp();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [qrFailed, setQrFailed] = useState(false);
  const lastStatus = useRef(null);

  const refresh = () =>
    apiClient.payments.sepayInfo(bookingCode).then(
      (next) => {
        if (lastStatus.current && lastStatus.current !== 'CONFIRMED' && next.status === 'CONFIRMED') {
          showToast('Đã nhận tiền cọc · đơn đã được xác nhận');
          reloadBookings();
          onReported?.();
        } else if (lastStatus.current !== next.status && !['HELD', 'PENDING_VERIFY'].includes(next.status)) {
          // Đơn hết hạn / bị hủy trong lúc danh sách còn hiện "Đang giữ chỗ" -> tải lại cho khớp
          reloadBookings();
        }
        lastStatus.current = next.status;
        setInfo(next);
        setError(null);
      },
      (err) => setError(errorMessage(err)),
    );

  useEffect(() => {
    refresh();
  }, [bookingCode]);

  const waiting = info && ['HELD', 'PENDING_VERIFY'].includes(info.status);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, bookingCode]);

  const copy = (text) => {
    navigator.clipboard?.writeText(String(text)).then(
      () => showToast('Đã sao chép'),
      () => undefined,
    );
  };

  if (!info && !error) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang tải mã thanh toán...</span>
      </div>
    );
  }

  if (info?.status === 'CONFIRMED') {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div>
          <div className="font-bold text-sm text-white">Đã nhận tiền cọc · đơn đã xác nhận</div>
          <p className="mt-0.5">Khung giờ đã được khóa cho bạn. Xem lại trong Lịch của tôi.</p>
        </div>
      </div>
    );
  }

  if (info && !waiting) {
    return (
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-700 text-xs text-slate-300 space-y-1">
        <div className="font-bold text-sm text-white">Đơn không còn nhận thanh toán</div>
        <p>Đơn đã hết hạn giữ chỗ hoặc đã bị hủy, đừng chuyển thêm tiền. Nếu đã chuyển, hãy gửi khiếu nại để được hoàn.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-800/70 space-y-3 text-xs text-left">
      <div className="font-bold text-white text-sm">Quét mã để thanh toán tiền cọc</div>

      {info?.received > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>
            Đã nhận {vnd(info.received)} / {vnd(info.deposit_amount)}. Còn thiếu <strong>{vnd(info.remaining)}</strong>, mã
            QR bên dưới đã cập nhật số tiền còn lại.
          </span>
        </div>
      )}

      {info && (
        <div className="flex flex-col sm:flex-row gap-4">
          {info.qr_url && !qrFailed ? (
            <img
              src={info.qr_url}
              alt="Mã VietQR thanh toán tiền cọc"
              onError={() => setQrFailed(true)}
              className="w-48 h-48 rounded-xl bg-white p-1.5 object-contain mx-auto sm:mx-0 shrink-0"
            />
          ) : (
            <div className="w-48 h-48 rounded-xl border border-dashed border-slate-700 text-slate-500 flex items-center justify-center text-center p-3 mx-auto sm:mx-0 shrink-0">
              Chưa cấu hình tài khoản nhận tiền SePay
            </div>
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <Row label="Ngân hàng" value={info.bank_code || '—'} />
            <Row
              label="Số tài khoản"
              value={info.bank_account || '—'}
              onCopy={info.bank_account ? () => copy(info.bank_account) : undefined}
            />
            <Row label="Chủ tài khoản" value={info.bank_holder || '—'} />
            <Row label="Số tiền" value={vnd(info.remaining)} highlight onCopy={() => copy(info.remaining)} />
            <Row label="Nội dung" value={info.content} onCopy={() => copy(info.content)} />
          </div>
        </div>
      )}

      {info && (
        <div className="space-y-1.5 text-slate-400">
          <p className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
            <span>Giữ nguyên nội dung chuyển khoản, đơn tự xác nhận vài giây sau khi tiền về.</span>
          </p>
          {info.hold_expires_at && (
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Giữ chỗ đến {hhmm(info.hold_expires_at)}, chuyển trước giờ này để không mất sân.</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
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
        <button type="button" onClick={onCopy} title="Sao chép" className="text-slate-400 hover:text-white cursor-pointer">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  </div>
);
