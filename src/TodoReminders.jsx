import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Clock, Calendar, 
  Bell, AlertCircle, CheckCircle2, ChevronDown, Filter, 
  Edit2, ChevronRight, X, Search, Star,
  BookOpen, FileText, CheckSquare, Square,
  Paperclip, Image as ImageIcon, Send, Pin, Sparkles,
  Tag, FolderPlus, MoreHorizontal, ArrowRight,
  ExternalLink, Check, Copy, Palette
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// Zoho Cliq Inspired Vibrant Sticky Note Colors
export const NOTE_COLORS = [
  { id: 'mint', name: 'Mint Green', bg: 'bg-[#C2E7DA]', text: 'text-emerald-950', border: 'border-emerald-300', accent: '#A2D2C2' },
  { id: 'amber', name: 'Amber Gold', bg: 'bg-[#F9BC60]', text: 'text-amber-950', border: 'border-amber-400', accent: '#E8A73E' },
  { id: 'cyan', name: 'Cyan Aqua', bg: 'bg-[#98D8D8]', text: 'text-cyan-950', border: 'border-cyan-300', accent: '#72C2C2' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-[#432371]', text: 'text-white', border: 'border-purple-800', accent: '#5A3494', isDark: true },
  { id: 'yellow', name: 'Warm Yellow', bg: 'bg-[#F3C053]', text: 'text-yellow-950', border: 'border-yellow-400', accent: '#DDAA3D' },
  { id: 'rose', name: 'Coral Rose', bg: 'bg-[#F7A072]', text: 'text-rose-950', border: 'border-rose-300', accent: '#E48654' },
  { id: 'blue', name: 'Sky Blue', bg: 'bg-[#A0C4E2]', text: 'text-blue-950', border: 'border-blue-300', accent: '#82AFD6' },
  { id: 'dark', name: 'Dark Slate', bg: 'bg-[#1E293B]', text: 'text-slate-100', border: 'border-slate-700', accent: '#334155', isDark: true }
];

export default function TodoReminders({
  currentUser: propUser,
  onOpenAssignModal,
  onOpenTaskDetails
}) {
  const { currentUser: authUser, userProfile } = useAuth();
  const { showToast, confirm } = useToast();
  const effectiveUser = propUser || userProfile || authUser;
  const uid = effectiveUser?.uid || effectiveUser?.id || authUser?.uid || null;

  // Real-time Notes from Firestore
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all', 'starred', 'todos'

  // Note Editor State (Drafting / Editing)
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorColor, setEditorColor] = useState('mint');
  const [editorChecklist, setEditorChecklist] = useState([]);
  const [editorNewChecklistText, setEditorNewChecklistText] = useState('');
  const [editorTags, setEditorTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Subscribe to Notes Collection in Firestore
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const q = query(collection(db, 'todos'), where('uid', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          title: d.title || 'Untitled Note',
          content: d.notes || d.content || '',
          color: d.color || 'mint',
          starred: Boolean(d.starred),
          pinned: Boolean(d.pinned),
          done: Boolean(d.done),
          checklist: Array.isArray(d.checklist) ? d.checklist : [],
          tags: Array.isArray(d.tags) ? d.tags : [],
          createdAt: d.createdAt ? d.createdAt.toDate() : (d.timestamp ? d.timestamp.toDate() : new Date()),
          linkedTaskId: d.linkedTaskId || null,
          assignedToName: d.assignedToName || null,
          priority: d.priority || 'Medium'
        });
      });

      // Sort: pinned first, then newest
      items.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      });

      setNotes(items);
      setLoading(false);

      setSelectedNote(prev => {
        if (!prev) return items[0] || null;
        return items.find(n => n.id === prev.id) || items[0] || null;
      });
    }, (err) => {
      console.error('Error fetching notes:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Sync selected note to editor form
  useEffect(() => {
    if (selectedNote) {
      setEditorTitle(selectedNote.title || '');
      setEditorContent(selectedNote.content || '');
      setEditorColor(selectedNote.color || 'mint');
      setEditorChecklist(selectedNote.checklist || []);
      setEditorTags(selectedNote.tags || []);
    } else {
      setEditorTitle('');
      setEditorContent('');
      setEditorColor('mint');
      setEditorChecklist([]);
      setEditorTags([]);
    }
  }, [selectedNote]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (activeTabFilter === 'starred' && !n.starred) return false;
      if (activeTabFilter === 'todos' && n.checklist.length === 0 && !n.done) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (n.title || '').toLowerCase().includes(q);
        const inContent = (n.content || '').toLowerCase().includes(q);
        const inTags = (n.tags || []).some(t => t.toLowerCase().includes(q));
        const inChecklist = (n.checklist || []).some(c => (c.text || '').toLowerCase().includes(q));
        if (!inTitle && !inContent && !inTags && !inChecklist) return false;
      }

      return true;
    });
  }, [notes, activeTabFilter, searchQuery]);

  // Create New Empty Note
  const handleStartNewNote = (initialType = 'write') => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorColor('mint');
    setEditorChecklist(initialType === 'todo' ? [{ id: Date.now().toString(), text: '', done: false }] : []);
    setEditorTags([]);
  };

  // Save Note to Firestore (Create or Update)
  const handleSaveNote = async () => {
    if (!uid) return;
    const cleanTitle = editorTitle.trim() || 'Untitled Note';
    if (!cleanTitle && !editorContent.trim() && editorChecklist.length === 0) return;

    setIsSaving(true);
    try {
      const payload = {
        uid,
        title: cleanTitle,
        notes: editorContent.trim(),
        content: editorContent.trim(),
        color: editorColor,
        checklist: editorChecklist.filter(c => c.text && c.text.trim().length > 0),
        tags: editorTags,
        starred: selectedNote ? Boolean(selectedNote.starred) : false,
        pinned: selectedNote ? Boolean(selectedNote.pinned) : false,
        done: selectedNote ? Boolean(selectedNote.done) : false,
        updatedAt: serverTimestamp()
      };

      if (selectedNote && selectedNote.id) {
        await updateDoc(doc(db, 'todos', selectedNote.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.priority = 'Medium';
        const docRef = await addDoc(collection(db, 'todos'), payload);
        setSelectedNote({ id: docRef.id, ...payload });
      }
      showToast('Note saved successfully', 'success');
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast('Error saving note: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save debounce on changes
  const saveTimeoutRef = useRef(null);
  const handleContentChange = (field, val) => {
    if (field === 'title') setEditorTitle(val);
    if (field === 'content') setEditorContent(val);
    if (field === 'color') setEditorColor(val);

    if (selectedNote && selectedNote.id) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const updateData = {
            [field === 'content' ? 'notes' : field]: val,
            updatedAt: serverTimestamp()
          };
          if (field === 'content') updateData.content = val;
          await updateDoc(doc(db, 'todos', selectedNote.id), updateData);
        } catch (e) {
          console.error('Auto-save error:', e);
        }
      }, 700);
    }
  };

  // Toggle Star
  const handleToggleStar = async (note, e) => {
    e?.stopPropagation();
    try {
      await updateDoc(doc(db, 'todos', note.id), {
        starred: !note.starred,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note, e) => {
    e?.stopPropagation();
    try {
      await updateDoc(doc(db, 'todos', note.id), {
        pinned: !note.pinned,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId, e) => {
    e?.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Note',
      message: 'Are you sure you want to delete this note? This action cannot be undone.',
      confirmText: 'Delete Note',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'todos', noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      showToast('Note deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting note:', err);
      showToast('Failed to delete note: ' + err.message, 'error');
    }
  };

  // Add checklist item in editor
  const handleAddChecklistItem = () => {
    if (!editorNewChecklistText.trim()) return;
    const updated = [
      ...editorChecklist, 
      { id: Date.now().toString(), text: editorNewChecklistText.trim(), done: false }
    ];
    setEditorChecklist(updated);
    setEditorNewChecklistText('');
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated });
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (itemId) => {
    const updated = editorChecklist.map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setEditorChecklist(updated);
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated });
    }
  };

  // Remove checklist item
  const handleRemoveChecklistItem = (itemId) => {
    const updated = editorChecklist.filter(item => item.id !== itemId);
    setEditorChecklist(updated);
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated });
    }
  };

  // Add Tag
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!editorTags.includes(clean)) {
      const updated = [...editorTags, clean];
      setEditorTags(updated);
      if (selectedNote?.id) {
        updateDoc(doc(db, 'todos', selectedNote.id), { tags: updated });
      }
    }
    setNewTagInput('');
  };

  // Promote note to official company task
  const handlePromoteToTask = (note) => {
    if (!onOpenAssignModal) return;
    onOpenAssignModal({
      title: note.title,
      description: note.content || (note.checklist || []).map(c => `• ${c.text}`).join('\n'),
      priority: note.priority || 'Medium',
      onSuccess: async (createdTaskId, assignedName) => {
        try {
          await updateDoc(doc(db, 'todos', note.id), {
            linkedTaskId: createdTaskId,
            assignedToName: assignedName || 'Assigned Staff',
            done: true,
            updatedAt: serverTimestamp()
          });
          showToast('Converted note to assigned task successfully', 'success');
        } catch (e) {
          console.error('Failed to link task:', e);
        }
      }
    });
  };

  // Format relative display date
  const formatNoteDate = (d) => {
    if (!d) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const currentColorConfig = NOTE_COLORS.find(c => c.id === editorColor) || NOTE_COLORS[0];

  return (
    <div className="h-[calc(100vh-4.5rem)] flex bg-[#111A2E] text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 font-sans select-none">
      
      {/* ========================================================
          LEFT COLUMN: NOTES LIST (Zoho Cliq Exact Style)
         ======================================================== */}
      <div className="w-80 sm:w-96 bg-[#162238] border-r border-slate-800 flex flex-col shrink-0">
        
        {/* Top Header Row with All Notes, Star, Search & + New Note */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-100">All Notes</h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              {filteredNotes.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTabFilter(prev => prev === 'starred' ? 'all' : 'starred')}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                activeTabFilter === 'starred'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Filter Starred"
            >
              <Star className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStartNewNote('write')}
              className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="New Note"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Search Input */}
        <div className="px-3.5 py-2 border-b border-slate-800/60 bg-[#131C2E]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A263D] text-xs text-slate-200 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 outline-none border border-slate-700/80 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Scrollable Sticky Notes Column (Exact Cliq Card Layout) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No notes found.</p>
              <button
                onClick={() => handleStartNewNote('write')}
                className="text-xs text-emerald-400 hover:underline font-bold"
              >
                Create your first note
              </button>
            </div>
          ) : (
            filteredNotes.map(note => {
              const isSelected = selectedNote?.id === note.id;
              const colorConfig = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
              const isDark = colorConfig.isDark;

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`relative p-3.5 rounded-2xl cursor-pointer transition-all border shadow-sm ${colorConfig.bg} ${
                    isSelected 
                      ? 'ring-2 ring-emerald-400 scale-[1.01] shadow-lg border-white/60' 
                      : `${colorConfig.border} hover:shadow-md hover:scale-[1.005]`
                  }`}
                >
                  {/* Top Row: Title + Pin/Star */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-xs font-bold truncate flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {note.pinned && (
                        <Pin className={`w-3 h-3 ${isDark ? 'text-amber-300' : 'text-amber-700'} fill-current`} />
                      )}
                      <button
                        onClick={(e) => handleToggleStar(note, e)}
                        className={`p-0.5 hover:scale-110 transition ${
                          note.starred 
                            ? 'text-amber-500 fill-amber-500' 
                            : isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${note.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Content Snippet */}
                  {note.content && (
                    <p className={`text-[11px] line-clamp-2 mb-2 font-mono whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {note.content}
                    </p>
                  )}

                  {/* Checklist preview snippet */}
                  {note.checklist.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {note.checklist.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                          {item.done ? (
                            <CheckSquare className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`} />
                          ) : (
                            <Square className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                          )}
                          <span className={`truncate ${item.done ? 'line-through opacity-60' : ''} ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer: Date */}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-black/10">
                    <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formatNoteDate(note.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: ACTIVE NOTE CONTENT & 5 ACTION BUTTONS
         ======================================================== */}
      <div className="flex-1 flex flex-col bg-[#0F172A] overflow-hidden">
        
        {/* Empty state: EXACT Zoho Cliq 5 Action Buttons screen */}
        {!selectedNote && !editorTitle && !editorContent && editorChecklist.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Start jotting down your ideas</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Quickly write notes, checklist items, or meeting highlights saved directly to your workspace.
              </p>
            </div>

            {/* Zoho Cliq Exact 5 Button Layout: Write | Capture | To Do | Attach | Draw */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 max-w-lg">
              
              <button
                onClick={() => handleStartNewNote('write')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#2A374F] text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Write</span>
              </button>

              <button
                onClick={() => {
                  handleStartNewNote('write');
                  setEditorTitle('Capture - ' + new Date().toLocaleDateString());
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#2A374F] text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Capture</span>
              </button>

              <button
                onClick={() => handleStartNewNote('todo')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#2A374F] text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <span>To Do</span>
              </button>

              <button
                onClick={() => {
                  handleStartNewNote('write');
                  setEditorContent('Attachment / Document link: ');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#2A374F] text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Paperclip className="w-4 h-4 text-blue-400" />
                <span>Attach</span>
              </button>

              <button
                onClick={() => {
                  handleStartNewNote('write');
                  setEditorColor('purple');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E293B] hover:bg-[#2A374F] text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Draw</span>
              </button>

            </div>
          </div>
        ) : (
          /* Active Note Editor */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Top Editor Toolbar */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-[#162238]">
              
              {/* Color Pill */}
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <button
                    onClick={() => setIsColorPickerOpen(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${currentColorConfig.bg} ${currentColorConfig.text} ${currentColorConfig.border}`}
                  >
                    <span>{currentColorConfig.name}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isColorPickerOpen && (
                    <div className="absolute left-0 mt-2 p-2 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-xl flex gap-1.5 z-50 animate-in fade-in">
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            handleContentChange('color', c.id);
                            setIsColorPickerOpen(false);
                          }}
                          className={`w-6 h-6 rounded-full border ${c.bg} ${c.border} hover:scale-110 transition shadow-xs`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {isSaving && (
                  <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                    Saving...
                  </span>
                )}
              </div>

              {/* Right Note Actions */}
              <div className="flex items-center gap-2">
                {selectedNote && onOpenAssignModal && (
                  <button
                    onClick={() => handlePromoteToTask(selectedNote)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                    title="Convert this note to official company assigned task"
                  >
                    <Send className="w-3 h-3" />
                    <span className="hidden sm:inline">Assign as Task</span>
                  </button>
                )}

                {selectedNote && (
                  <>
                    <button
                      onClick={(e) => handleTogglePin(selectedNote, e)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        selectedNote.pinned 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Pin Note"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleToggleStar(selectedNote, e)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        selectedNote.starred 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 fill-amber-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Star Note"
                    >
                      <Star className={`w-3.5 h-3.5 ${selectedNote.starred ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => handleDeleteNote(selectedNote.id, e)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  onClick={handleSaveNote}
                  className="px-4 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Save Note
                </button>
              </div>

            </div>

            {/* Note Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full no-scrollbar">
              
              <input
                type="text"
                placeholder="Note Title..."
                value={editorTitle}
                onChange={(e) => handleContentChange('title', e.target.value)}
                className="w-full bg-transparent text-xl font-bold text-slate-100 placeholder-slate-600 outline-none border-b border-slate-800 pb-2 focus:border-emerald-500 transition"
              />

              <textarea
                rows="7"
                placeholder="Start typing your thoughts, instructions, or meeting highlights..."
                value={editorContent}
                onChange={(e) => handleContentChange('content', e.target.value)}
                className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed focus:ring-0 border-0"
              />

              {/* Checklist Section */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Checklist Items</span>
                </span>

                <div className="space-y-1.5">
                  {editorChecklist.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-2 bg-[#1A263D] rounded-xl border border-slate-700 text-xs">
                      <div 
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="flex items-center gap-2 flex-1 cursor-pointer truncate"
                      >
                        {item.done ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className={`truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.text}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add an actionable to-do item..."
                    value={editorNewChecklistText}
                    onChange={(e) => setEditorNewChecklistText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                    className="flex-1 bg-[#1A263D] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Tags Pill Row */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {editorTags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700 flex items-center gap-1">
                      #{t}
                      <button 
                        onClick={() => setEditorTags(editorTags.filter(tag => tag !== t))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  
                  <input
                    type="text"
                    placeholder="+ tag"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                    className="w-20 bg-transparent text-[10px] text-slate-300 placeholder-slate-600 outline-none px-1"
                  />
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
