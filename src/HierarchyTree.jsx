import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronRight, ChevronDown, Search, User, Shield, 
  Building2, ArrowDownRight, ChevronsUpDown, Network, Sparkles
} from 'lucide-react';
import { getRoleLevel } from './orgTree';

// Distinct subtle color styling per level (L1 darkest green to L6 slate)
const LEVEL_STYLES = {
  1: { bg: 'bg-[#05331F]', text: 'text-emerald-300', border: 'border-[#05331F]', label: 'Executive Leadership' },
  2: { bg: 'bg-[#07472B]', text: 'text-emerald-200', border: 'border-[#07472B]', label: 'Senior Operations & GM' },
  3: { bg: 'bg-emerald-800', text: 'text-white', border: 'border-emerald-800', label: 'Department Heads / CSO' },
  4: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', label: 'Branch / State Managers' },
  5: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', label: 'Assistant Managers / Leads' },
  6: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Frontline Specialists' }
};

export default function HierarchyTree({
  employees = [],
  currentUserId,
  onSelectEmployee
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const selfNodeRef = useRef(null);

  // Build tree from real reportsTo / reportingManagerId
  const { rootNodes, orphanNodes } = useMemo(() => {
    const empMap = new Map();
    employees.forEach(e => {
      const id = String(e.id || e.employeeId || '');
      empMap.set(id, { ...e, children: [] });
    });

    const roots = [];
    const orphans = [];
    const visited = new Set();

    employees.forEach(e => {
      const id = String(e.id || e.employeeId || '');
      const mgrId = String(e.reportsTo || e.reportingManagerId || '');
      const node = empMap.get(id);

      if (!node) return;

      // If no manager or self-referential
      if (!mgrId || mgrId === id || mgrId === 'null') {
        const role = (e.role || e.designation || '').toLowerCase();
        if (role.includes('director') || role.includes('general manager')) {
          roots.push(node);
        } else {
          orphans.push(node);
        }
      } else if (empMap.has(mgrId)) {
        // Prevent circular reference
        const parent = empMap.get(mgrId);
        if (!parent.children.some(c => c.id === node.id)) {
          parent.children.push(node);
        }
      } else {
        // Manager ID not found in current directory
        orphans.push(node);
      }
    });

    // Sort children by role level
    const sortNodes = (list) => {
      list.sort((a, b) => getRoleLevel(a.role || a.designation) - getRoleLevel(b.role || b.designation));
      list.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortNodes(item.children);
        }
      });
    };

    sortNodes(roots);
    sortNodes(orphans);

    return { rootNodes: roots, orphanNodes: orphans };
  }, [employees]);

  // Toggle collapse
  const toggleCollapse = (nodeId) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    const allIds = new Set(employees.map(e => String(e.id || e.employeeId)));
    setCollapsedNodes(allIds);
  };

  // Auto-scroll to self position on load
  useEffect(() => {
    if (selfNodeRef.current) {
      selfNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentUserId]);

  // Initials helper
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Node Component
  const renderNode = (node, depth = 0) => {
    const nodeId = String(node.id || node.employeeId);
    const isMe = nodeId === String(currentUserId);
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(nodeId);
    const roleName = node.designation || node.role || 'Staff Member';
    const lvl = getRoleLevel(roleName);
    const lvlStyle = LEVEL_STYLES[lvl] || LEVEL_STYLES[6];

    // Search query match
    const q = searchQuery.trim().toLowerCase();
    const isHighlighted = q && (
      (node.fullName || node.name || '').toLowerCase().includes(q) ||
      (node.role || node.designation || '').toLowerCase().includes(q) ||
      (node.employeeId || '').toLowerCase().includes(q)
    );

    return (
      <div key={nodeId} className="relative">
        <div className="flex items-center gap-2 py-1.5">
          {/* Connector line indentation */}
          <div style={{ width: `${depth * 28}px` }} className="shrink-0 flex items-center justify-end relative h-10">
            {depth > 0 && (
              <div className="absolute right-0 w-4 h-[2px] bg-slate-200 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Expand / Collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapse(nodeId)}
              aria-label={isCollapsed ? "Expand branch" : "Collapse branch"}
              className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0 transition-colors cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          {/* Node Card */}
          <div
            ref={isMe ? selfNodeRef : null}
            onClick={() => onSelectEmployee && onSelectEmployee(node)}
            className={`flex-1 max-w-2xl p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
              isHighlighted
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                : isMe
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/30 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
            }`}
          >
            {/* Left: Avatar + Name + Level Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#05331F] text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {getInitials(node.fullName || node.name)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {node.fullName || node.name}
                  </h4>
                  {isMe && (
                    <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.2 rounded-full inline-flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Your Position</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {roleName}
                </p>
              </div>
            </div>

            {/* Right: Dept + Direct Reports Count + Level Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                {node.department || 'Operations'}
              </span>

              {hasChildren && (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
                </span>
              )}

              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${lvlStyle.bg} ${lvlStyle.text} ${lvlStyle.border}`}>
                L{lvl}
              </span>
            </div>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && !isCollapsed && (
          <div className="relative pl-3 border-l border-slate-200 ml-4 space-y-1">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Legend & Controls Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search hierarchy to highlight..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {/* Level Legend (L1 to L6) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[1, 2, 3, 4, 5, 6].map(lvl => {
            const st = LEVEL_STYLES[lvl];
            return (
              <span 
                key={lvl} 
                className={`text-[10px] font-mono px-2 py-1 rounded-md border font-semibold ${st.bg} ${st.text} ${st.border} whitespace-nowrap`}
                title={st.label}
              >
                L{lvl}
              </span>
            );
          })}
        </div>

        {/* Expand / Collapse All buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            Collapse all
          </button>
        </div>

      </div>

      {/* Main Hierarchy Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Corporate Reporting Structure
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Constructed directly from verified reporting manager links in employee master data.
          </p>
        </div>

        {/* Tree Nodes */}
        <div className="pt-2 space-y-2 overflow-x-auto">
          {rootNodes.map(root => renderNode(root, 0))}
        </div>

        {/* Unassigned / Orphans Section */}
        {orphanNodes.length > 0 && (
          <div className="pt-6 mt-6 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Unassigned Reporting Lines ({orphanNodes.length})
              </h4>
              <p className="text-xs text-slate-400">
                Personnel awaiting designated supervisor assignments or external staff.
              </p>
            </div>
            <div className="space-y-1.5">
              {orphanNodes.map(orphan => renderNode(orphan, 0))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
