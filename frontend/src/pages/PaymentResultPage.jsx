import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, PageLayout } from '../components/ui/PageLayout';

const RESULTS = {
  success: {
    icon: CheckCircle2,
    cls: 'text-emerald-400',
    title: 'Đặt sân thành công!',
    text: 'Đã nhận tiền cọc qua VNPay. Khung giờ đã được khóa cho bạn, chủ sân đã nhận thông báo.',
  },
  failed: {
    icon: XCircle,
    cls: 'text-rose-400',
    title: 'Thanh toán chưa thành công',
    text: 'Giao dịch bị hủy hoặc thất bại. Đơn vẫn được giữ chỗ trong thời gian còn lại, bạn có thể thanh toán lại.',
  },
  late: {
    icon: AlertTriangle,
    cls: 'text-amber-400',
    title: 'Đơn đã hết hạn giữ chỗ',
    text: 'Hệ thống đã nhận tiền nhưng đơn không còn hiệu lực. Hãy gửi khiếu nại trong Lịch của tôi để được hoàn tiền.',
  },
  invalid: {
    icon: AlertTriangle,
    cls: 'text-amber-400',
    title: 'Không xác minh được giao dịch',
    text: 'Dữ liệu trả về từ cổng thanh toán không hợp lệ. Nếu tài khoản đã bị trừ tiền, hãy gửi khiếu nại kèm mã đơn.',
  },
};

// VNPay trả trình duyệt về backend, backend kiểm chữ ký rồi chuyển sang đây: ?status=&code=
export const PaymentResultPage = () => {
  const [params] = useSearchParams();
  const { reloadBookings, isLoggedIn } = useApp();
  const result = RESULTS[params.get('status')] || RESULTS.invalid;
  const code = params.get('code');
  const Icon = result.icon;

  useEffect(() => {
    if (isLoggedIn) reloadBookings();
  }, [isLoggedIn]);

  return (
    <PageLayout backTo="/" icon={CreditCard} eyebrow="Thanh toán tiền cọc" title="Kết quả thanh toán">
      <Card className="max-w-lg mx-auto text-center space-y-3 py-10">
        <Icon className={`w-14 h-14 mx-auto ${result.cls}`} />
        <h2 className="text-lg font-bold text-white">{result.title}</h2>
        {code && (
          <p className="text-xs text-slate-400">
            Mã đơn: <span className="font-mono font-bold text-emerald-400">{code}</span>
          </p>
        )}
        <p className="text-sm text-slate-300">{result.text}</p>
        <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to="/lich-cua-toi"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Xem lịch của tôi
          </Link>
          <Link to="/" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
            Về trang chủ
          </Link>
        </div>
      </Card>
    </PageLayout>
  );
};
