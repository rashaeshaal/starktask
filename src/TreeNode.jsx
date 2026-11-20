// src/TreeNode.jsx
// Tree node component with real connector lines, search highlight & compact card

import React, { useRef, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, User, Shield, 
  Building2, Sparkles 
} from 'lucide-react';
import { formatName, formatEmpId, formatDepartment, LEVEL_STYLES } from './orgHelpers';

export default function TreeNode({
  node,
  level = 0,
  isLast = false,
  isMe = false,
  searchQuery = '',
  collapsedNodes,
  onToggleCollapse,
  onSelectEmployee
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes.has(node._id || node.id);
  const fullName = formatName(node.fullName || node.name || 'Employee');
  const roleTitle = node.designation || node.role || 'Staff';
  const empIdFormatted = formatEmpId(node.employeeId || node._empNum);
  const deptFormatted = formatDepartment(node.department || node.departmentId);
  const levelConfig = LEVEL_STYLES[node.level] || LEVEL_STYLES[6];

  // Match search query
  const matchesSearch = Boolean(
    searchQuery.trim() && (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      empIdFormatted.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptFormatted.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="relative pl-6">
      {/* Vertical line from parent running down */}
      <div 
        className={`absolute left-0 top-0 bottom-0 border-l border-slate-200 ${
          isLast ? 'h-6' : 'h-full'
        }`}
      />

      {/* Horizontal connector line into node */}
      <div className="absolute left-0 top-6 w-6 border-t border-slate-200" />

      {/* Node Card */}
      <div className="py-1.5 inline-block">
        <div 
          onClick={() => onSelectEmployee && onSelectEmployee(node)}
          className={`group inline-flex items-center gap-3 px-3 py-2 bg-white rounded-xl border transition-all duration-150 cursor-pointer shadow-sm ${
            isMe 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
              : matchesSearch
                ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20'
                : 'border-slate-200 hover:border-emerald-300 hover:shadow'
          }`}
        >
          {/* Expand / Collapse toggle or bullet */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node._id || node.id);
              }}
              className="w-5 h-5 -ml-1 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300 ml-0.5 mr-1" />
          )}

          {/* Level pill */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}>
            L{node.level}
          </span>

          {/* Avatar / Initials */}
          <div className="w-7 h-7 rounded-lg bg-[#05331F] text-emerald-200 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {fullName.charAt(0)}
          </div>

          {/* Details */}
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-900 transition-colors">
                {fullName}
              </span>
              <span className="font-mono text-[10px] font-medium text-slate-400">
                {empIdFormatted}
              </span>
              {isMe && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{roleTitle}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{deptFormatted}</span>
              {hasChildren && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-medium">
                    {node.children.length} {node.children.length === 1 ? 'direct report' : 'direct reports'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render children recursively if not collapsed */}
      {hasChildren && !isCollapsed && (
        <div className="relative">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child._id || child.id || idx}
              node={child}
              level={level + 1}
              isLast={idx === node.children.length - 1}
              isMe={String(child.id) === String(isMe) || String(child.employeeId) === String(isMe)}
              searchQuery={searchQuery}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              onSelectEmployee={onSelectEmployee}
            />
          ))}
        </div>
      )}
    </div>
  );
}

