import React from 'react';

/**
 * Premium Modern Enterprise SaaS KPI Card
 * Clean white surface, subtle neutral borders, soft shadow, refined tinted icon container,
 * crisp numerical typography, and optional contextual delta/trend badges.
 */
export default function DashboardKPICard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend = null, // { value: '+12%', isPositive: true, label: 'vs yesterday' }
  onClick,
  className = ''
}) {
  const variantStyles = {
    default: {
      iconBg: 'bg-slate-100 text-slate-600',
      valueText: 'text-slate-900',
      borderHover: 'hover:border-slate-300'
    },
    success: {
      iconBg: 'bg-emerald-50 text-emerald-700',
      valueText: 'text-[#05331F]',
      borderHover: 'hover:border-emerald-300'
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-700',
      valueText: 'text-amber-900',
      borderHover: 'hover:border-amber-300'
    },
    danger: {
      iconBg: 'bg-rose-50 text-rose-700',
      valueText: 'text-rose-700',
      borderHover: 'hover:border-rose-300'
    },
    info: {
      iconBg: 'bg-blue-50 text-blue-700',
      valueText: 'text-blue-900',
      borderHover: 'hover:border-blue-300'
    }
  };

  const style = variantStyles[variant] || variantStyles.default;
  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs transition-all duration-150 flex flex-col justify-between ${
        isInteractive ? `cursor-pointer ${style.borderHover} hover:shadow-xs` : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase truncate">
          {label}
        </span>
        {Icon && (
          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg sm:text-xl font-bold tracking-tight ${style.valueText}`}>
            {value}
          </span>
          {trend && (
            <span
              className={`text-[9px] font-semibold px-1 py-0.2 rounded flex items-center gap-0.5 ${
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>

        {subtext && (
          <p className="text-[10px] text-slate-500 mt-0.5 truncate font-normal">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

