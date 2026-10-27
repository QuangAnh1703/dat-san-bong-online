import React, { useEffect, useState } from 'react';
import { Copy, FlaskConical } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';

// img.vietqr.io nhận mã ngân hàng dạng tên viết liền (vietcombank, techcombank...)
export const vietQrUrl = ({ bankName, bankAccount, bankHolder, amount, content }) =>
  bankName && bankAccount
    ? `https://img.vietqr.io/image/${encodeURIComponent(bankName.toLowerCase().replace(/\s+/g, ''))}-${encodeURIComponent(
        bankAccount,
      )}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(bankHolder || '')}`
    : null;

const ACCENT = { emerald: 'text-emerald-400', amber: 'text-amber-400', cyan: 'text-cyan-400' };

// Mã VietQR + thông tin chuyển khoản; nội dung chuyển khoản là khóa để hệ thống tự gạch nợ
export const TransferQR = ({ transfer, tone = 'emerald' }) => {
  const { showToast } = useApp();
  const [qrFailed, setQrFailed] = useState(false);
  const qr = vietQrUrl(transfer);
  const copy = (text) =>
    navigator.clipboard?.writeText(text).then(
      () => showToast('Đã sao chép'),
      () => undefined,
    );

  return (
    <div className="flex flex-col sm:flex-row gap-4 text-xs">
      {qr && !qrFailed && (
        <img
          src={qr}
          alt="Mã VietQR chuyển khoản"
          onError={() => setQrFailed(true)}
          className="w-44 h-44 rounded-xl bg-white p-1.5 object-contain mx-auto sm:mx-0 shrink-0"
        />
      )}
      <div className="space-y-1.5 flex-1 min-w-0">
        <Row label="Ngân hàng" value={transfer.bankName || 'Chưa cấu hình'} />
        <Row label="Số tài khoản" value={transfer.bankAccount || '—'} onCopy={transfer.bankAccount && (() => copy(transfer.bankAccount))} />
        <Row label="Chủ tài khoản" value={transfer.bankHolder || '—'} />
        <Row label="Số tiền" value={`${Number(transfer.amount).toLocaleString('vi-VN')}đ`} valueCls={ACCENT[tone]} />
        <Row label="Nội dung" value={transfer.content} onCopy={() => copy(transfer.content)} />
      </div>
    </div>
  );
};

const Row = ({ label, value, valueCls = 'text-white', onCopy }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-400 shrink-0">{label}:</span>
    <span className={`font-bold text-right break-all flex items-center gap-1 ${valueCls}`}>
      {value}
      {onCopy && (
        <button type="button" onClick={onCopy} title="Sao chép" className="text-slate-400 hover:text-white cursor-pointer">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  </div>
);

let mockModeCache = null;

// Chỉ hiện khi backend chưa cấu hình webhook ngân hàng (môi trường phát triển)
export const MockTransferButton = ({ content, amount, onDone }) => {
  const { showToast } = useApp();
  const [mock, setMock] = useState(mockModeCache);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mockModeCache !== null) return;
    apiClient.payments.bankConfig().then(
      (cfg) => {
        mockModeCache = Boolean(cfg.mock);
        setMock(mockModeCache);
      },
      () => setMock(false),
    );
  }, []);

  if (!mock) return null;

  const send = async () => {
    setBusy(true);
    try {
      const r = await apiClient.payments.mockTransfer({ content, amount });
      showToast(r.result === 'confirmed' ? 'Ngân hàng báo có · đã khớp lệnh' : `Kết quả khớp lệnh: ${r.result}`, r.result === 'confirmed' ? 'success' : 'error');
      await onDone?.();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy}
      className="w-full py-2 rounded-lg border border-dashed border-violet-800 text-violet-300 hover:bg-violet-950/50 disabled:opacity-60 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <FlaskConical className="w-3.5 h-3.5" />
      <span>{busy ? 'Đang gửi...' : 'Giả lập ngân hàng báo có (dev)'}</span>
    </button>
  );
};

export const toTransfer = (t) => ({
  bankName: t.bank_name || null,
  bankAccount: t.bank_account || null,
  bankHolder: t.bank_holder || null,
  amount: Number(t.amount) || 0,
  content: t.content,
});
