import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Clock, Calendar, 
  Search, Star, BookOpen, FileText, CheckSquare, Square,
  Paperclip, Image as ImageIcon, Send, Pin, Sparkles,
  Tag, ChevronDown, Check, ArrowLeft, Edit3, Palette,
  ExternalLink, X, ListFilter, AlertCircle
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// Clean, soft pastel accent colors that work harmoniously with a light interface
export const NOTE_COLORS = [
  { id: 'slate', name: 'Clean White', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', dot: 'bg-slate-300' },
  { id: 'emerald', name: 'Emerald Mint', bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-950', dot: 'bg-emerald-500' },
  { id: 'amber', name: 'Amber Glow', bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-950', dot: 'bg-amber-500' },
  { id: 'cyan', name: 'Sky Cyan', bg: 'bg-cyan-50/70', border: 'border-cyan-200', text: 'text-cyan-950', dot: 'bg-cyan-500' },
  { id: 'purple', name: 'Soft Purple', bg: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-950', dot: 'bg-purple-500' },
  { id: 'rose', name: 'Coral Rose', bg: 'bg-rose-50/70', border: 'border-rose-200', text: 'text-rose-950', dot: 'bg-rose-500' }
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

  // Filters & Selected State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'starred' | 'todos' | 'attachments'

  // Responsive: track mobile active view (list vs editor)
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);

  // Note Editor State (Drafting / Editing)
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorColor, setEditorColor] = useState('slate');
  const [editorChecklist, setEditorChecklist] = useState([]);
  const [editorNewChecklistText, setEditorNewChecklistText] = useState('');
  const [editorTags, setEditorTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

  // 1. Subscribe to Notes Collection in Firestore
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
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
          color: d.color || 'slate',
          starred: Boolean(d.starred),
          pinned: Boolean(d.pinned),
          done: Boolean(d.done),
          checklist: Array.isArray(d.checklist) ? d.checklist : [],
          tags: Array.isArray(d.tags) ? d.tags : [],
          type: d.type || (d.checklist?.length > 0 ? 'todo' : 'write'),
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : new Date(),
          updatedAt: d.updatedAt ? (d.updatedAt.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt)) : null,
          linkedTaskId: d.linkedTaskId || null,
          assignedToName: d.assignedToName || null,
          priority: d.priority || 'Medium'
        });
      });

      // Sort: pinned first, then newest
      items.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        const timeA = a.updatedAt?.getTime?.() || a.createdAt?.getTime?.() || 0;
        const timeB = b.updatedAt?.getTime?.() || b.createdAt?.getTime?.() || 0;
        return timeB - timeA;
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

  // Sync selected note into editor state
  useEffect(() => {
    if (selectedNote) {
      setEditorTitle(selectedNote.title || '');
      setEditorContent(selectedNote.content || '');
      setEditorColor(selectedNote.color || 'slate');
      setEditorChecklist(selectedNote.checklist || []);
      setEditorTags(selectedNote.tags || []);
      setSaveStatus('saved');
    } else {
      setEditorTitle('');
      setEditorContent('');
      setEditorColor('slate');
      setEditorChecklist([]);
      setEditorTags([]);
      setSaveStatus('saved');
    }
  }, [selectedNote]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (activeTabFilter === 'starred' && !n.starred) return false;
      if (activeTabFilter === 'todos' && n.checklist.length === 0 && !n.done && n.type !== 'todo') return false;
      if (activeTabFilter === 'attachments' && n.type !== 'attach' && !n.content.toLowerCase().includes('attach')) return false;

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

  // Start a new note
  const handleStartNewNote = (initialType = 'write') => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent(
      initialType === 'attach' ? 'Attachment / Document reference: ' :
      initialType === 'capture' ? 'Photo note / On-site capture observation: ' : ''
    );
    setEditorColor(initialType === 'draw' ? 'purple' : 'slate');
    setEditorChecklist(initialType === 'todo' ? [{ id: Date.now().toString(), text: '', done: false }] : []);
    setEditorTags([]);
    setIsMobileEditorOpen(true);
  };

  // Select existing note
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setIsMobileEditorOpen(true);
  };

  // Save or Create Note immediately
  const handleSaveNote = async () => {
    if (!uid) return;
    const cleanTitle = editorTitle.trim() || 'Untitled Note';
    if (!cleanTitle && !editorContent.trim() && editorChecklist.length === 0) return;

    setSaveStatus('saving');
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
        type: editorChecklist.length > 0 ? 'todo' : 'write',
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
      setSaveStatus('saved');
      showToast('Note saved', 'success');
    } catch (err) {
      console.error('Failed to save note:', err);
      setSaveStatus('saved');
      showToast('Failed to save note: ' + err.message, 'error');
    }
  };

  // Auto-save debounce on typing
  const saveTimeoutRef = useRef(null);
  const handleContentChange = (field, val) => {
    if (field === 'title') setEditorTitle(val);
    if (field === 'content') setEditorContent(val);
    if (field === 'color') setEditorColor(val);

    if (selectedNote && selectedNote.id) {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const updateData = {
            [field === 'content' ? 'notes' : field]: val,
            updatedAt: serverTimestamp()
          };
          if (field === 'content') updateData.content = val;
          await updateDoc(doc(db, 'todos', selectedNote.id), updateData);
          setSaveStatus('saved');
        } catch (e) {
          console.error('Auto-save error:', e);
          setSaveStatus('saved');
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

  // Delete Note using custom modal
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
        setIsMobileEditorOpen(false);
      }
      showToast('Note deleted', 'success');
    } catch (err) {
      console.error('Error deleting note:', err);
      showToast('Failed to delete note: ' + err.message, 'error');
    }
  };

  // Checklist Actions
  const handleAddChecklistItem = () => {
    if (!editorNewChecklistText.trim()) return;
    const updated = [
      ...editorChecklist, 
      { id: Date.now().toString(), text: editorNewChecklistText.trim(), done: false }
    ];
    setEditorChecklist(updated);
    setEditorNewChecklistText('');
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated, updatedAt: serverTimestamp() });
    }
  };

  const handleToggleChecklistItem = (itemId) => {
    const updated = editorChecklist.map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setEditorChecklist(updated);
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated, updatedAt: serverTimestamp() });
    }
  };

  const handleRemoveChecklistItem = (itemId) => {
    const updated = editorChecklist.filter(item => item.id !== itemId);
    setEditorChecklist(updated);
    if (selectedNote?.id) {
      updateDoc(doc(db, 'todos', selectedNote.id), { checklist: updated, updatedAt: serverTimestamp() });
    }
  };

  // Tag Actions
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!editorTags.includes(clean)) {
      const updated = [...editorTags, clean];
      setEditorTags(updated);
      if (selectedNote?.id) {
        updateDoc(doc(db, 'todos', selectedNote.id), { tags: updated, updatedAt: serverTimestamp() });
      }
    }
    setNewTagInput('');
  };

  // Promote note to company assigned task
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
          showToast('Converted note to assigned task', 'success');
        } catch (e) {
          console.error('Failed to link task:', e);
        }
      }
    });
  };

  // Format date helper
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
    <div className="h-[calc(100vh-8.5rem)] min-h-[520px] bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col font-sans">
      
      {/* 2-PANE WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ========================================================
            LEFT PANE: NOTES LIST
           ======================================================== */}
        <div className={`w-full lg:w-80 xl:w-90 bg-white border-r border-slate-200 flex flex-col shrink-0 ${
          isMobileEditorOpen ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Header row: "All Notes", Badge, Star filter toggle & "+" New Note */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">All Notes</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {filteredNotes.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTabFilter(prev => prev === 'starred' ? 'all' : 'starred')}
                aria-label="Filter starred notes"
                title={activeTabFilter === 'starred' ? "Show all notes" : "Filter starred notes"}
                className={`p-2 rounded-lg border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                  activeTabFilter === 'starred'
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Star className={`w-[18px] h-[18px] ${activeTabFilter === 'starred' ? 'fill-amber-500 text-amber-500' : ''}`} strokeWidth={1.75} />
              </button>

              <button
                type="button"
                onClick={() => handleStartNewNote('write')}
                aria-label="Create new note"
                title="Create new note"
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Search Row */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50">
            <div className="relative">
              <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search notes, tags, or to-dos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-8 py-2 border border-slate-200 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'starred', label: 'Starred' },
                { id: 'todos', label: 'To Do' },
                { id: 'attachments', label: 'Attachments' }
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveTabFilter(chip.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 transition-colors duration-150 ${
                    activeTabFilter === chip.id
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Note List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {loading ? (
              // Skeleton loading state
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map(k => (
                  <div key={k} className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2 animate-pulse">
                    <div className="h-3.5 bg-slate-200 rounded-md w-3/4"></div>
                    <div className="h-2.5 bg-slate-200 rounded-md w-full"></div>
                    <div className="h-2 bg-slate-200 rounded-md w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              // Empty list state
              <div className="h-64 flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <FileText className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">No notes found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try altering your search or create a new one.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartNewNote('write')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  Create your first note
                </button>
              </div>
            ) : (
              filteredNotes.map(note => {
                const isSelected = selectedNote?.id === note.id;
                const noteColor = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];

                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-colors duration-150 border ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-300 border-l-[3px] border-l-emerald-600 shadow-xs'
                        : `${noteColor.bg} border-slate-200 hover:bg-slate-50 hover:border-slate-300`
                    }`}
                  >
                    {/* Top Row: Title + Pin/Star */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-semibold text-slate-900 truncate flex-1 leading-snug">
                        {note.title || 'Untitled Note'}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {note.pinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" strokeWidth={1.75} />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(note, e)}
                          aria-label={note.starred ? "Unstar note" : "Star note"}
                          className={`p-0.5 rounded transition ${
                            note.starred ? 'text-amber-500' : 'text-slate-300 group-hover:text-slate-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${note.starred ? 'fill-amber-400 text-amber-500' : ''}`} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    {/* 1-Line Preview */}
                    {note.content && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                        {note.content}
                      </p>
                    )}

                    {/* Checklist preview snippet */}
                    {note.checklist.length > 0 && (
                      <div className="space-y-0.5 mb-2">
                        {note.checklist.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                            {item.done ? (
                              <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={1.75} />
                            ) : (
                              <Square className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} />
                            )}
                            <span className={`truncate ${item.done ? 'line-through text-slate-400' : ''}`}>
                              {item.text || 'Item'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meta Row: Date, Type, Tags */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{formatNoteDate(note.createdAt)}</span>
                        {note.tags && note.tags.length > 0 && (
                          <span className="font-mono text-[10px] text-slate-500">
                            #{note.tags[0]}
                          </span>
                        )}
                      </div>

                      {note.linkedTaskId && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-medium">
                          <Check className="w-2.5 h-2.5" />
                          <span>Task</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT PANE: EDITOR & 5 ACTIONS
           ======================================================== */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 overflow-hidden ${
          !isMobileEditorOpen ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* EMPTY STATE: 5 ACTION BUTTONS */}
          {!selectedNote && !editorTitle && !editorContent && editorChecklist.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shadow-xs">
                <BookOpen className="w-8 h-8" strokeWidth={1.75} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Start jotting down your ideas</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Quickly write notes, checklist items, or meeting highlights saved directly to your workspace.
                </p>
              </div>

              {/* 5 Consistent Action Buttons: Write | Capture | To Do | Attach | Draw */}
              <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl">
                
                <button
                  type="button"
                  onClick={() => handleStartNewNote('write')}
                  className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors duration-150 flex items-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <Edit3 className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.75} />
                  <span>Write</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleStartNewNote('capture');
                    setEditorTitle('Capture - ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
                  }}
                  className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors duration-150 flex items-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <ImageIcon className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.75} />
                  <span>Capture</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartNewNote('todo')}
                  className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors duration-150 flex items-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <CheckSquare className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.75} />
                  <span>To Do</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartNewNote('attach')}
                  className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors duration-150 flex items-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <Paperclip className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.75} />
                  <span>Attach</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartNewNote('draw')}
                  className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors duration-150 flex items-center gap-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <Palette className="w-[18px] h-[18px] text-emerald-600" strokeWidth={1.75} />
                  <span>Draw</span>
                </button>

              </div>
            </div>
          ) : (
            /* ACTIVE EDITOR PANE */
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
              
              {/* Top Toolbar */}
              <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
                
                {/* Left: Mobile back button & Color Picker */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMobileEditorOpen(false)}
                    aria-label="Back to notes list"
                    className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(prev => !prev)}
                      aria-label="Choose note accent color"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <span className={`w-3 h-3 rounded-full ${currentColorConfig.dot}`}></span>
                      <span>{currentColorConfig.name}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {isColorPickerOpen && (
                      <div className="absolute left-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg flex gap-1.5 z-50 animate-in fade-in">
                        {NOTE_COLORS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleContentChange('color', c.id);
                              setIsColorPickerOpen(false);
                            }}
                            className={`w-6 h-6 rounded-full border border-slate-300 ${c.dot} hover:scale-110 transition shadow-2xs`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions (Assign, Pin, Star, Delete, Save) */}
                <div className="flex items-center gap-1.5">
                  {selectedNote && onOpenAssignModal && (
                    <button
                      type="button"
                      onClick={() => handlePromoteToTask(selectedNote)}
                      title="Convert note into company assigned task"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors duration-150"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Assign as Task</span>
                    </button>
                  )}

                  {selectedNote && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(selectedNote, e)}
                        aria-label={selectedNote.pinned ? "Unpin note" : "Pin note"}
                        title={selectedNote.pinned ? "Unpin note" : "Pin note"}
                        className={`p-2 rounded-lg border transition-colors duration-150 ${
                          selectedNote.pinned 
                            ? 'bg-amber-50 border-amber-200 text-amber-700' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <Pin className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(selectedNote, e)}
                        aria-label={selectedNote.starred ? "Unstar note" : "Star note"}
                        title={selectedNote.starred ? "Unstar note" : "Star note"}
                        className={`p-2 rounded-lg border transition-colors duration-150 ${
                          selectedNote.starred 
                            ? 'bg-amber-50 border-amber-200 text-amber-700 fill-amber-500' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <Star className={`w-[18px] h-[18px] ${selectedNote.starred ? 'fill-amber-500 text-amber-500' : ''}`} strokeWidth={1.75} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(selectedNote.id, e)}
                        aria-label="Delete note"
                        title="Delete note"
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors duration-150"
                      >
                        <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    Save
                  </button>
                </div>

              </div>

              {/* Editor Scroll Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl w-full mx-auto">
                
                {/* Title Input: Large, borderless */}
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={editorTitle}
                  onChange={(e) => handleContentChange('title', e.target.value)}
                  className="w-full text-2xl font-semibold text-slate-900 placeholder-slate-300 outline-none border-b border-transparent focus:border-slate-200 pb-2 transition"
                />

                {/* Body Textarea */}
                <textarea
                  rows="8"
                  placeholder="Start typing your thoughts, meeting notes, instructions or reminders..."
                  value={editorContent}
                  onChange={(e) => handleContentChange('content', e.target.value)}
                  className="w-full text-sm text-slate-700 placeholder-slate-400 outline-none resize-none leading-relaxed border-0 p-0 focus:ring-0"
                />

                {/* Actionable Checklist Section */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                      <span>Checklist Items</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {editorChecklist.filter(c => c.done).length} / {editorChecklist.length} done
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {editorChecklist.map(item => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs transition"
                      >
                        <div 
                          onClick={() => handleToggleChecklistItem(item.id)}
                          className="flex items-center gap-2.5 flex-1 cursor-pointer truncate"
                        >
                          {item.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
                          )}
                          <span className={`truncate text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          aria-label="Remove item"
                          className="text-slate-400 hover:text-rose-600 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Checklist Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add an actionable to-do item..."
                      value={editorNewChecklistText}
                      onChange={(e) => setEditorNewChecklistText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Tags Row */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    {editorTags.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-mono flex items-center gap-1.5 border border-slate-200">
                        #{t}
                        <button 
                          type="button"
                          onClick={() => setEditorTags(editorTags.filter(tag => tag !== t))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    
                    <input
                      type="text"
                      placeholder="+ Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                      className="w-24 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none px-1 py-1"
                    />
                  </div>
                </div>

              </div>

              {/* Bottom Auto-Save Indicator */}
              <div className="px-6 py-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {selectedNote?.updatedAt 
                    ? `Last updated: ${formatNoteDate(selectedNote.updatedAt)}` 
                    : 'Personal workspace note'}
                </span>
                <span className="font-medium text-slate-500">
                  {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
                </span>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
