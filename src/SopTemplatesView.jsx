import React, { useState } from 'react';
import { 
  FileText, Clock, CheckCircle2, ShieldCheck, ArrowRight, 
  Play, Pause, Plus, Search, Filter, Layers, AlertCircle, RefreshCw
} from 'lucide-react';
import { SOP_TASK_TEMPLATES } from './sopTaskTemplates';
import { generateDailySopTasks } from './sopGeneratorEngine';

export default function SopTemplatesView({ employees = [], departments = [], currentUser }) {
  const [templates, setTemplates] = useState(SOP_TASK_TEMPLATES);
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  const filteredTemplates = templates.filter(t => {
    const matchDept = selectedDept === 'all' || t.departmentId === selectedDept;
    const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.targetDesignation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  const handleToggleTemplate = (templateId) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) return { ...t, active: !t.active };
      return t;
    }));
  };

  const handleRunGenerator = async () => {
    setIsGenerating(true);
    setGenerationResult(null);
    try {
      const res = await generateDailySopTasks(employees, null, currentUser);
      setGenerationResult(res);
    } catch (err) {
      console.error('Task generator error:', err);
      alert('Error triggering task generation: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#05331F] bg-[#05331F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              SOP 2.0 Template Engine
            </span>
            <span className="text-xs text-slate-400">• Scheduled & Recurring Task Generator</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Operational Task Templates & Automation</h2>
          <p className="text-xs text-slate-500">
            Configure standard company schedules, checklists, deadlines, and auto-dispatch daily recurring tasks to staff
          </p>
        </div>

        {/* Generate Daily Tasks Now Action Button */}
        <button
          onClick={handleRunGenerator}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#05331F] hover:bg-[#07472c] active:bg-[#032214] text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-300 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating Tasks...' : 'Sync Today’s SOP Tasks'}</span>
        </button>
      </div>

      {/* Generation Alert */}
      {generationResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold">Daily SOP Sync Completed for {generationResult.date}: </span>
              <span>
                {generationResult.createdCount} new tasks generated into personal dashboards, {generationResult.skippedCount} existing tasks maintained.
              </span>
            </div>
          </div>
          <button 
            onClick={() => setGenerationResult(null)}
            className="text-xs font-bold text-emerald-800 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search templates by title or target designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <span className="font-bold text-slate-800">{filteredTemplates.length}</span> active master templates
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(tpl => (
          <div 
            key={tpl.id}
            className={`p-5 rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${
              tpl.active ? 'bg-white border-slate-200/90 shadow-xs hover:border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {tpl.departmentName}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    tpl.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                    tpl.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tpl.priority}
                  </span>

                  <button
                    onClick={() => handleToggleTemplate(tpl.id)}
                    className={`p-1 rounded-lg text-xs font-bold transition ${
                      tpl.active ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-200'
                    }`}
                    title={tpl.active ? 'Deactivate Template' : 'Activate Template'}
                  >
                    {tpl.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <h4 className="font-bold text-sm text-slate-900 leading-snug">{tpl.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{tpl.instructions}</p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Target Role:</span>
                <span className="font-bold text-slate-800">{tpl.targetDesignation}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Working Window:</span>
                <span className="font-mono font-semibold text-[#05331F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                  {tpl.startTime} → {tpl.deadlineTime}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                <div className="font-bold mb-1 text-slate-700">Checklist ({tpl.checklist.length} items):</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  {tpl.checklist.slice(0, 2).map((item, idx) => (
                    <li key={idx} className="truncate">{item.text}</li>
                  ))}
                  {tpl.checklist.length > 2 && (
                    <li className="italic text-slate-400">+{tpl.checklist.length - 2} more verification steps...</li>
                  )}
                </ul>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}

