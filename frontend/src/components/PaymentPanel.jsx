import React, { useEffect, useRef, useState } from 'react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { AlertCircle, AlertTriangle, CheckCircle2, Copy, CreditCard, FlaskConical, Loader2, Wallet } from 'lucide-react';

// img.vietqr.io nhận mã ngân hàng dạng tên viết liền (vietcombank, techcombank...)
const vietQrUrl = (t, amount) =>
  t.bankName && t.bankAccount
    ? `https://img.vietqr.io/image/${encodeURIComponent(t.bankName.toLowerCase().replace(/\s+/g, ''))}-${encodeURIComponent(
        t.bankAccount,
      )}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(t.content)}&accountName=${encodeURIComponent(
        t.bankHolder || '',
      )}`
    : null;

const POLL_MS = 5000;
const hhmm = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const PaymentPanel = ({ bookingCode, onReported }) => {
  const { getTransferInfo, reportTransfer, reloadBookings, showToast } = useApp();
  const [info, setInfo] = useState(null);
  const [mockMode, setMockMode] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [payingWallet, setPayingWallet] = useState(false);

  const lastStatus = useRef(null);

  const refresh = () =>
    getTransferInfo(bookingCode).then(
      (next) => {
        if (lastStatus.current && lastStatus.current !== 'CONFIRMED' && next.status === 'CONFIRMED') {
          showToast('Đã nhận đủ tiền cọc · đơn đã được xác nhận');
          reloadBookings();
          onReported?.();
        }
        lastStatus.current = next.status;
        setInfo(next);
      },
      (err) => setError(errorMessage(err)),
    );

  useEffect(() => {
    if (!info?.venueId) return;
    apiClient.wallets.myAtVenue(info.venueId).then((r) => setWallet(r.wallet), () => undefined);
  }, [info?.venueId]);

  // Ví hội viên: trừ ví (đã áp % giảm của gói), thiếu thì phần còn lại chuyển VietQR
  const handleWallet = async () => {
    setPayingWallet(true);
    setError(null);
    try {
      const r = await apiClient.wallets.pay(bookingCode);
      if (r.result === 'partial') {
        showToast(`Đã trừ ${r.paid_from_wallet.toLocaleString('vi-VN')}đ từ ví, chuyển khoản thêm ${r.remaining.toLocaleString('vi-VN')}đ`);
      }
      setWallet((w) => w && { ...w, balance: Number(w.balance) - r.paid_from_wallet });
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPayingWallet(false);
    }
  };

  useEffect(() => {
    refresh();
    apiClient.payments.bankConfig().then(
      (cfg) => setMockMode(Boolean(cfg.mock)),
      () => undefined,
    );
  }, [bookingCode]);

  // Ngân hàng báo có qua webhook -> đơn tự chuyển trạng thái, panel tự cập nhật theo
  const waiting = info && ['HELD', 'PENDING_VERIFY'].includes(info.status);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, bookingCode]);

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
      await refresh();
      onReported?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  // Cổng xác nhận ngay khi thanh toán xong, không cần chủ sân đối soát
  const handleVnpay = async () => {
    setRedirecting(true);
    setError(null);
    try {
      const { payment_url } = await apiClient.payments.startVnpay(bookingCode);
      window.location.assign(payment_url);
    } catch (err) {
      setError(errorMessage(err));
      setRedirecting(false);
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
        <p>Đơn đã hết hạn giữ chỗ hoặc đã bị hủy, đừng chuyển thêm tiền cho đơn này.</p>
        {info.refundPendingAmount > 0 && (
          <p className="text-amber-300">
            Khoản {info.refundPendingAmount.toLocaleString('vi-VN')}đ bạn đã chuyển đang chờ hoàn trả 100%.
          </p>
        )}
      </div>
    );
  }

  const received = info?.amountReceived || 0;
  const remaining = info ? Math.max(info.amount - received, 0) : 0;
  const reported = info?.status === 'PENDING_VERIFY';
  const qr = info ? vietQrUrl(info, remaining) : null;

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-800/70 space-y-3 text-xs text-left">
      {info && received === 0 && !reported && wallet?.status === 'ACTIVE' && Number(wallet.balance) > 0 && (
        <button
          onClick={handleWallet}
          disabled={payingWallet}
          className="w-full p-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer flex items-center gap-3 text-left"
        >
          {payingWallet ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <Wallet className="w-5 h-5 shrink-0" />}
          <span className="min-w-0">
            <span className="block font-bold">Ví hội viên {info.venueName}</span>
            <span className="block text-emerald-100/80">
              Số dư {Number(wallet.balance).toLocaleString('vi-VN')}đ
              {wallet.discount_percent > 0 && ` · giảm thêm ${wallet.discount_percent}% tiền sân`}
              {Number(wallet.balance) < info.amount && ' · thiếu thì chuyển khoản phần còn lại'}
            </span>
          </span>
        </button>
      )}
      {info && received === 0 && !reported && (
        <>
          <div className="font-bold text-white text-sm">Thanh toán tiền cọc</div>
          <button
            onClick={handleVnpay}
            disabled={redirecting}
            className="w-full py-3 rounded-xl bg-[#005baa] hover:bg-[#0a6cc4] disabled:opacity-60 text-white font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            {redirecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            <span>
              {redirecting ? 'Đang chuyển sang VNPay...' : `Thanh toán ${info.amount.toLocaleString('vi-VN')}đ qua VNPay`}
            </span>
          </button>
          <p className="text-slate-500 text-center">Thẻ ATM / QR ngân hàng · xác nhận đặt sân ngay lập tức</p>
          <div className="flex items-center gap-3 text-[0.75rem] text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            <span>hoặc quét VietQR</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
        </>
      )}
      <div className="font-bold text-white text-sm">Chuyển khoản tiền cọc</div>

      {received > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>
            Đã nhận {received.toLocaleString('vi-VN')}đ / {info.amount.toLocaleString('vi-VN')}đ. Bạn còn thiếu{' '}
            <strong>{remaining.toLocaleString('vi-VN')}đ</strong>
            {info.holdExpiresAt && `, vui lòng chuyển bổ sung trước ${hhmm(info.holdExpiresAt)} để giữ chỗ`}.
          </span>
        </div>
      )}

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
            <Row
              label={received > 0 ? 'Cần chuyển thêm' : 'Số tiền'}
              value={`${remaining.toLocaleString('vi-VN')}đ`}
              highlight
            />
            <Row label="Nội dung" value={info.content} onCopy={() => copy(info.content)} />
          </div>
        </div>
      )}

      {info && (
        <p className="text-slate-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
          <span>Giữ nguyên nội dung chuyển khoản, hệ thống tự xác nhận đơn vài giây sau khi tiền về.</span>
        </p>
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
          <span>Đã báo chuyển khoản. Đơn sẽ được xác nhận khi tiền về hoặc khi chủ sân đối soát.</span>
        </div>
      ) : (
        info &&
        received === 0 && (
          <button
            onClick={handleReport}
            disabled={sending}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 font-semibold cursor-pointer"
          >
            {sending ? 'Đang gửi...' : 'Đã chuyển nhưng chưa được xác nhận? Báo chủ sân'}
          </button>
        )
      )}

      {info && mockMode && <MockBankBox info={info} remaining={remaining} onDone={refresh} />}
    </div>
  );
};

// Chỉ hiện khi backend chưa cấu hình webhook ngân hàng (môi trường phát triển)
const MockBankBox = ({ info, remaining, onDone }) => {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [content, setContent] = useState(info.content);
  const [busy, setBusy] = useState(false);

  const RESULT_TEXT = {
    confirmed: 'Khớp lệnh: đơn đã xác nhận',
    underpaid: 'Khớp lệnh: thanh toán thiếu',
    unmatched: 'Không khớp được: đã vào hàng đợi đối soát thủ công',
    refund_pending: 'Đơn hết hiệu lực: tiền chờ hoàn',
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiClient.payments.mockTransfer({
        booking_code: info.code,
        amount: Number(amount) || remaining,
        content,
      });
      showToast(RESULT_TEXT[r.result] || r.result, r.result === 'confirmed' ? 'success' : 'error');
      await onDone();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full h-9 px-3 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-violet-500';

  return (
    <div className="rounded-xl border border-dashed border-violet-800 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 text-violet-300 font-semibold cursor-pointer"
      >
        <FlaskConical className="w-3.5 h-3.5" />
        <span>Giả lập ngân hàng báo có (chỉ khi phát triển)</span>
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-2">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Số tiền (mặc định ${remaining.toLocaleString('vi-VN')})`}
            className={input}
          />
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung" className={input} />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-60 text-white font-bold cursor-pointer"
          >
            {busy ? 'Đang gửi...' : 'Gửi biến động số dư'}
          </button>
        </form>
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
