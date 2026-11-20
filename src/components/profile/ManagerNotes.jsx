// src/components/profile/ManagerNotes.jsx
// Section 9: Manager notes (HR and leadership only), add/edit/delete

import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, Edit3, Check, X, ShieldAlert } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatName } from '../../orgHelpers';

export default function ManagerNotes({ employeeId, currentUser, canManageNotes = false }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // If user cannot manage or view manager notes, component renders null (hide, do not disable)
  if (!canManageNotes) return null;

  useEffect(() => {
    if (!employeeId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchNotes = async () => {
      try {
        const empIdStr = String(employeeId);
        const notesRef = collection(db, 'employeeNotes');
        const q = query(notesRef, where('targetEmployeeId', '==', empIdStr));
        const snap = await getDocs(q);

        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });

        list.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        if (isMounted) {
          setNotes(list);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error fetching employeeNotes:', err);
        if (isMounted) {
          setNotes([]);
          setIsLoading(false);
        }
      }
    };

    fetchNotes();
    return () => { isMounted = false; };
  }, [employeeId]);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const payload = {
        targetEmployeeId: String(employeeId),
        authorId: String(currentUser?.id || currentUser?.uid || 'leadership'),
        authorName: formatName(currentUser?.fullName || currentUser?.name || 'Manager'),
        authorRole: currentUser?.role || 'Leadership',
        content: newNoteText.trim(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'employeeNotes'), payload);
      setNotes([{ id: docRef.id, ...payload }, ...notes]);
      setNewNoteText('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create manager note:', err);
    }
  };

  const handleSaveEdit = async (noteId) => {
    if (!editingText.trim()) return;

    try {
      await updateDoc(doc(db, 'employeeNotes', noteId), {
        content: editingText.trim(),
        updatedAt: new Date().toISOString()
      });

      setNotes(notes.map(n => n.id === noteId ? { ...n, content: editingText.trim() } : n));
      setEditingNoteId(null);
      setEditingText('');
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(db, 'employeeNotes', noteId));
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Confidential Manager Notes
              </h4>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                HR / Leadership Only
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Private performance observations, 1:1 records and feedback
            </p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            aria-label="Add manager note"
            className="h-8 px-3 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>Add Note</span>
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <form onSubmit={handleCreateNote} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Type confidential feedback, promotion consideration, or observation notes..."
            rows={3}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewNoteText('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newNoteText.trim()}
              className="h-8 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      ) : notes.length === 0 && !isAdding ? (
        <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
          <p className="text-xs text-slate-500">
            No manager notes recorded yet. Notes are only visible to authorized leaders.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'Recent';

            return (
              <div 
                key={note.id} 
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{note.authorName}</span>
                    <span className="text-[10px] text-slate-400">({note.authorRole})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditingText(note.content);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Edit note"
                      aria-label="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1 text-[11px] rounded text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1 bg-emerald-700 text-white rounded text-[11px] font-semibold"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

