import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Tailwind cần class tĩnh nên map màu theo vai trò ở đây
const TONES = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
};

// Khung chung cho mọi màn hình chức năng: cùng độ rộng, cùng header, cùng khoảng cách
export const PageLayout = ({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
  backTo,
  backLabel = 'Về trang chủ',
  tone = 'emerald',
  children,
}) => (
  <main className="flex-1 w-full">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 mb-4 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Link>
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 mb-6 sm:mb-8 border-b border-slate-800">
        <div className="min-w-0">
          {eyebrow && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2 ${TONES[tone]}`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{eyebrow}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">{title}</h1>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </header>

      {children}
    </div>
  </main>
);

// Thẻ nội dung dùng chung trong các trang
export const Card = ({ className = '', children }) => (
  <section className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 ${className}`}>{children}</section>
);
