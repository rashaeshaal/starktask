import React from 'react';

interface AvatarStackProps {
  assignees?: Array<{ name: string; avatar?: string }>;
  limit?: number;
  onAdd?: () => void;
}

export default function AvatarStack({ assignees = [], limit = 3, onAdd }: AvatarStackProps) {
  const visible = assignees.slice(0, limit);
  const overflow = assignees.length - limit;

  if (assignees.length === 0) {
    return (
      <div className="flex items-center gap-1">
        {onAdd ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="w-6 h-6 rounded-full border border-dashed border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-700 flex items-center justify-center text-xs transition cursor-pointer"
            title="Assign someone"
          >
            +
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Unassigned</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((u, i) => {
        const initials = (u.name || 'User')
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-[#0B3D2E] text-emerald-300 font-bold text-[10px] flex items-center justify-center border-2 border-white ring-1 ring-slate-200 shadow-2xs"
            title={u.name}
          >
            {initials}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center border-2 border-white ring-1 ring-slate-200 shadow-2xs"
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
