import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

// Màu icon theo vai trò, giống prop tone của PageLayout
const TONES = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
};

// Hộp thoại dùng chung: chỉ cho thao tác ngắn (đăng nhập, xác nhận, form nhỏ).
// Mobile hiển thị dạng bottom sheet, từ sm trở lên căn giữa.
export const Modal = ({
  title,
  description,
  icon: Icon,
  onClose,
  size = 'md',
  tone = 'emerald',
  children,
}) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // size="full": phủ kín màn hình, nội dung tự dàn trang (dùng cho đăng nhập / đăng ký)
  if (size === 'full') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0b130e] animate-in fade-in duration-150">
        <div role="dialog" aria-modal="true" className="relative min-h-full w-full">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
            <CloseButton onClick={onClose} large />
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          className={`relative w-full ${SIZES[size]} bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl text-xs animate-in fade-in zoom-in-95 duration-150`}
        >
          {title ? (
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-800">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {Icon && <Icon className={`w-4 h-4 shrink-0 ${TONES[tone]}`} />}
                  <span>{title}</span>
                </h2>
                {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
              </div>
              <CloseButton onClick={onClose} />
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-10">
              <CloseButton onClick={onClose} />
            </div>
          )}
          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

const CloseButton = ({ onClick, large }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Đóng"
    className={`${large ? 'w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800' : 'w-8 h-8 rounded-lg'} shrink-0 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer`}
  >
    <X className={large ? 'w-5 h-5' : 'w-4 h-4'} />
  </button>
);
