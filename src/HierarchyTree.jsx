// src/HierarchyTree.jsx
// Hierarchy Tree with real connector lines, search highlight, expand/collapse, L1-L6 legend, and glowing self-marker

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, X, ChevronsUpDown, Network, Sparkles, AlertCircle
} from 'lucide-react';
import TreeNode from './TreeNode';
import { buildHierarchy, formatName, LEVEL_STYLES } from './orgHelpers';

export default function HierarchyTree({
  employees = [],
  currentUserId,
  onSelectEmployee
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const treeContainerRef = useRef(null);

  // Build hierarchy tree with robust dual-ID matching and fallback
  const { rootNodes, orphanNodes } = useMemo(() => {
    return buildHierarchy(employees);
  }, [employees]);

  // Expand / collapse all nodes
  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    const allIds = new Set(employees.map(e => String(e.id || e.employeeId)));
    setCollapsedNodes(allIds);
  };

  const toggleCollapse = (nodeId) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Check if current user is found in the tree
  const currentUserIdStr = currentUserId ? String(currentUserId).toLowerCase().trim() : '';
  const myNode = useMemo(() => {
    if (!currentUserIdStr) return null;
    return employees.find(e => {
      const id = String(e.id || '').toLowerCase();
      const empId = String(e.employeeId || '').toLowerCase();
      const uid = String(e.uid || '').toLowerCase();
      return id === currentUserIdStr || empId === currentUserIdStr || uid === currentUserIdStr;
    });
  }, [employees, currentUserIdStr]);

  const scrollToMyPosition = () => {
    if (treeContainerRef.current) {
      const selfEl = treeContainerRef.current.querySelector('[data-is-me="true"]');
      if (selfEl) {
        selfEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Toolbar: Search, Expand/Collapse, My Position, and Legend */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search hierarchy by name, role or employee ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={expandAll}
            className="h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors"
          >
            Collapse all
          </button>
          
          {myNode && (
            <button
              type="button"
              onClick={scrollToMyPosition}
              className="h-10 px-3.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Your Position
            </button>
          )}
        </div>
      </div>

      {/* Level Legend Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider pl-1">Levels:</span>
        {Object.entries(LEVEL_STYLES).map(([lvl, style]) => (
          <div key={lvl} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${lvl === '1' ? 'bg-[#05331F]' : lvl === '2' ? 'bg-[#07472B]' : lvl === '3' ? 'bg-emerald-800' : lvl === '4' ? 'bg-emerald-600' : lvl === '5' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span className="font-medium">{style.label}</span>
          </div>
        ))}
      </div>

      {/* Main Tree Container */}
      <div 
        ref={treeContainerRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto min-h-[450px]"
      >
        {rootNodes.length > 0 ? (
          <div className="space-y-4">
            {rootNodes.map((root, idx) => (
              <TreeNode
                key={root._id || root.id || idx}
                node={root}
                level={0}
                isLast={idx === rootNodes.length - 1}
                isMe={
                  Boolean(currentUserIdStr && (
                    String(root.id).toLowerCase() === currentUserIdStr ||
                    String(root.employeeId).toLowerCase() === currentUserIdStr ||
                    String(root.uid).toLowerCase() === currentUserIdStr
                  ))
                }
                searchQuery={searchQuery}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={toggleCollapse}
                onSelectEmployee={onSelectEmployee}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Network className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">No hierarchy data available</p>
            <p className="text-xs text-slate-400 mt-1">Assign reporting managers to employees to build the tree.</p>
          </div>
        )}

        {/* Collapsible Unassigned / Orphan Section (only if any truly unresolvable records exist) */}
        {orphanNodes.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3 text-amber-700">
              <AlertCircle className="w-4 h-4" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Unassigned Reporting Lines ({orphanNodes.length})
              </h4>
            </div>
            <div className="space-y-2">
              {orphanNodes.map((orphan, idx) => (
                <TreeNode
                  key={orphan._id || orphan.id || idx}
                  node={orphan}
                  level={0}
                  isLast={idx === orphanNodes.length - 1}
                  isMe={
                    Boolean(currentUserIdStr && (
                      String(orphan.id).toLowerCase() === currentUserIdStr ||
                      String(orphan.employeeId).toLowerCase() === currentUserIdStr
                    ))
                  }
                  searchQuery={searchQuery}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={toggleCollapse}
                  onSelectEmployee={onSelectEmployee}
                />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
