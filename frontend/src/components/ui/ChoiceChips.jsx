import React from 'react';

// Nhóm nút bật/tắt để chọn nhiều giá trị (vị trí, khu vực...). `max` giới hạn số lựa chọn.
export const ChoiceChips = ({ options, value, onChange, max }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value.includes(o.value);
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={on}
          onClick={() =>
            onChange(on ? value.filter((v) => v !== o.value) : max && value.length >= max ? value : [...value, o.value])
          }
          className={`h-10 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
            on
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);
