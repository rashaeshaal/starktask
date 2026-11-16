import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckSquare, Square, Plus, Trash2, Clock, Calendar, 
  Bell, AlertCircle, CheckCircle2, ChevronDown, Filter, 
  Edit2, ChevronRight, X, AlertTriangle, Search, Repeat,
  CalendarDays, Check, MoreVertical, ArrowRight, ExternalLink,
  Bookmark, Sparkles, Loader2
} from 'lucide-react';
import { db } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};

const REMINDER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'at_due', label: 'At due time' },
  { value: '10_min', label: '10 minutes before' },
  { value: '1_hour', label: '1 hour before' },
  { value: '1_day', label: '1 day before' }
];

const REPEAT_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' }
];

// Helper to compute remindAt Timestamp based on dueAt Date and selected option
function computeRemindAt(dueDateObj, reminderOption) {
  if (!dueDateObj || reminderOption === 'none') return null;
  const timeMs = dueDateObj.getTime();
  let remindMs = timeMs;

  if (reminderOption === '10_min') {
    remindMs = timeMs - (10 * 60 * 1000);
  } else if (reminderOption === '1_hour') {
    remindMs = timeMs - (60 * 60 * 1000);
  } else if (reminderOption === '1_day') {
    remindMs = timeMs - (24 * 60 * 60 * 1000);
  }

  return Timestamp.fromDate(new Date(remindMs));
}

// Format relative date nicely
function formatDisplayDate(dateObj) {
  if (!dateObj) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago`;

  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format time string
function formatDisplayTime(dateObj) {
  if (!dateObj) return '';
  return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function TodoReminders({ 
  currentUser: propUser,
  onOpenAssignModal,
  onOpenTaskDetails
}) {
  const { currentUser: authUser, userProfile } = useAuth();
  const effectiveUser = propUser || userProfile || authUser;
  const uid = effectiveUser?.uid || effectiveUser?.id || authUser?.uid || null;

  // Real-time Todos from Firestore
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active filter state: 'all' | 'today' | 'overdue' | 'done'
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Quick Add Bar State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickTime, setQuickTime] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalDueDate, setModalDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalDueTime, setModalDueTime] = useState('18:00');
  const [modalReminder, setModalReminder] = useState('none');
  const [modalPriority, setModalPriority] = useState(PRIORITIES.MEDIUM);
  const [modalRepeat, setModalRepeat] = useState('None');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Active Overflow Menu for row actions
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Toast Notification State
  const [toasts, setToasts] = useState([]);
  const remindedIdsRef = useRef(new Set());

  // Collapsed state for completed group
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // Request browser notification permission explicitly when a reminder is configured
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('Notification permission request error:', e);
        }
      }
    }
  };

  // Toast helper
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // 1. Subscribe to Firestore `todos` collection for current user (private query by uid)
  useEffect(() => {
    if (!uid) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const todosRef = collection(db, 'todos');
    const q = query(todosRef, where('uid', '==', uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          dueAtDate: data.dueAt?.toDate ? data.dueAt.toDate() : (data.dueAt ? new Date(data.dueAt) : null),
          remindAtDate: data.remindAt?.toDate ? data.remindAt.toDate() : (data.remindAt ? new Date(data.remindAt) : null)
        });
      });

      // Sort by dueAt ascending
      list.sort((a, b) => {
        const timeA = a.dueAtDate ? a.dueAtDate.getTime() : 0;
        const timeB = b.dueAtDate ? b.dueAtDate.getTime() : 0;
        return timeA - timeB;
      });

      setTodos(list);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to todos:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // 2. Reminder check loop: runs every 30 seconds
  useEffect(() => {
    const checkReminders = async () => {
      if (!todos.length) return;
      const now = new Date().getTime();

      for (const todo of todos) {
        if (todo.done || todo.reminded || !todo.remindAtDate) continue;
        const remindTime = todo.remindAtDate.getTime();

        if (now >= remindTime && !remindedIdsRef.current.has(todo.id)) {
          remindedIdsRef.current.add(todo.id);

          try {
            await updateDoc(doc(db, 'todos', todo.id), { reminded: true });
          } catch (e) {
            console.error('Failed to update reminded state:', e);
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('STARK STEEL Task Reminder', {
                body: `${todo.title} is due at ${formatDisplayTime(todo.dueAtDate)}`,
                icon: '/favicon.ico'
              });
            } catch (err) {
              console.warn('Native notification failed:', err);
            }
          }

          showToast(`Reminder: ${todo.title} is due!`);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [todos]);

  // Close overflow menus on outside click
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Compute counters
  const counters = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000);

    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let doneCount = 0;

    todos.forEach(t => {
      if (t.done) {
        doneCount++;
        return;
      }
      if (!t.dueAtDate) {
        todayCount++;
        return;
      }

      const dueTime = t.dueAtDate.getTime();
      if (dueTime < todayStart) {
        overdueCount++;
      } else if (dueTime >= todayStart && dueTime < todayEnd) {
        todayCount++;
      } else {
        upcomingCount++;
      }
    });

    return { today: todayCount, overdue: overdueCount, upcoming: upcomingCount, done: doneCount };
  }, [todos]);

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000);

    return todos.filter(t => {
      if (activeFilter === 'today') {
        if (t.done) return false;
        if (!t.dueAtDate) return true;
        const time = t.dueAtDate.getTime();
        return time >= todayStart && time < todayEnd;
      }
      if (activeFilter === 'overdue') {
        if (t.done || !t.dueAtDate) return false;
        return t.dueAtDate.getTime() < todayStart;
      }
      if (activeFilter === 'done') {
        return !!t.done;
      }

      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNotes) return false;
      }

      return true;
    });
  }, [todos, activeFilter, priorityFilter, searchQuery]);

  // Group items: Overdue, Today, Upcoming, and Completed
  const groupedTodos = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000);

    const overdue = [];
    const today = [];
    const upcoming = [];
    const completed = [];

    filteredTodos.forEach(t => {
      if (t.done) {
        completed.push(t);
        return;
      }
      if (!t.dueAtDate) {
        today.push(t);
        return;
      }

      const time = t.dueAtDate.getTime();
      if (time < todayStart) {
        overdue.push(t);
      } else if (time >= todayStart && time < todayEnd) {
        today.push(t);
      } else {
        upcoming.push(t);
      }
    });

    return { overdue, today, upcoming, completed };
  }, [filteredTodos]);

  // Reminders for the right side panel (upcoming items with a remindAtDate)
  const remindersPanelItems = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);
    const dayAfterTomorrowStart = tomorrowStart + (24 * 60 * 60 * 1000);

    const todayItems = [];
    const tomorrowItems = [];

    todos.forEach(t => {
      if (t.done || !t.remindAtDate) return;
      const remindTime = t.remindAtDate.getTime();

      if (remindTime >= todayStart && remindTime < tomorrowStart) {
        todayItems.push(t);
      } else if (remindTime >= tomorrowStart && remindTime < dayAfterTomorrowStart) {
        tomorrowItems.push(t);
      }
    });

    return { today: todayItems, tomorrow: tomorrowItems };
  }, [todos]);

  // Quick Add Action
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || !uid) return;

    setIsQuickAdding(true);
    try {
      let dueAtTimestamp = null;
      const datePart = quickDate || new Date().toISOString().split('T')[0];
      const timePart = quickTime || '18:00';
      const parsedDate = new Date(`${datePart}T${timePart}:00`);
      if (!isNaN(parsedDate.getTime())) {
        dueAtTimestamp = Timestamp.fromDate(parsedDate);
      }

      const newDoc = {
        title: quickTitle.trim(),
        notes: '',
        dueAt: dueAtTimestamp,
        remindAt: null,
        priority: PRIORITIES.MEDIUM,
        done: false,
        repeat: 'None',
        uid,
        linkedTaskId: null,
        reminded: false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'todos'), newDoc);
      setQuickTitle('');
      setQuickTime('');
      showToast('To-do added successfully');
    } catch (err) {
      console.error('Quick add failed:', err);
      showToast('Failed to add to-do');
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Toggle Checkbox (Optimistic with rollback & repeating recurrence handler)
  const handleToggleDone = async (todo) => {
    const previousState = todo.done;
    const nextState = !previousState;

    // Optimistic UI update
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: nextState } : t));

    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        done: nextState,
        completedAt: nextState ? serverTimestamp() : null
      });

      // If repeating to-do is completed, create next occurrence automatically
      if (nextState && todo.repeat && todo.repeat !== 'None') {
        let nextDate = todo.dueAtDate ? new Date(todo.dueAtDate.getTime()) : new Date();
        if (todo.repeat === 'Daily') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (todo.repeat === 'Weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        const nextDueTimestamp = Timestamp.fromDate(nextDate);
        let nextRemindTimestamp = null;
        if (todo.remindAtDate && todo.dueAtDate) {
          const delta = todo.dueAtDate.getTime() - todo.remindAtDate.getTime();
          nextRemindTimestamp = Timestamp.fromDate(new Date(nextDate.getTime() - delta));
        }

        await addDoc(collection(db, 'todos'), {
          title: todo.title,
          notes: todo.notes || '',
          dueAt: nextDueTimestamp,
          remindAt: nextRemindTimestamp,
          priority: todo.priority || PRIORITIES.MEDIUM,
          done: false,
          repeat: todo.repeat,
          uid,
          linkedTaskId: todo.linkedTaskId || null,
          reminded: false,
          createdAt: serverTimestamp()
        });
        showToast(`Next recurrence scheduled for ${formatDisplayDate(nextDate)}`);
      }
    } catch (err) {
      console.error('Failed to toggle to-do:', err);
      // Rollback on failure
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: previousState } : t));
      showToast('Failed to update to-do');
    }
  };

  // Delete Action
  const handleDelete = async (todoId) => {
    try {
      await deleteDoc(doc(db, 'todos', todoId));
      showToast('To-do deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete to-do');
    }
  };

  // Convert to Task (Director Operations universal authority)
  const handleConvertToTask = (todo) => {
    if (onOpenAssignModal) {
      onOpenAssignModal({
        title: todo.title,
        description: todo.notes || `Created from personal to-do`,
        deadlineDate: todo.dueAtDate ? todo.dueAtDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        onSuccess: async (createdTaskId, assignedName) => {
          try {
            await updateDoc(doc(db, 'todos', todo.id), {
              done: true,
              linkedTaskId: createdTaskId,
              assignedToName: assignedName || 'Assigned Staff',
              completedAt: serverTimestamp()
            });
            showToast(`Converted to task & assigned to ${assignedName || 'team member'}`);
          } catch (e) {
            console.error('Failed to link converted task:', e);
          }
        }
      });
    }
  };

  // Open Edit Modal
  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setModalTitle(todo.title || '');
    setModalNotes(todo.notes || '');

    if (todo.dueAtDate) {
      setModalDueDate(todo.dueAtDate.toISOString().split('T')[0]);
      setModalDueTime(todo.dueAtDate.toTimeString().slice(0, 5));
    } else {
      setModalDueDate(new Date().toISOString().split('T')[0]);
      setModalDueTime('18:00');
    }

    setModalPriority(todo.priority || PRIORITIES.MEDIUM);
    setModalRepeat(todo.repeat || 'None');
    setModalReminder('none');
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTodo(null);
    setModalTitle('');
    setModalNotes('');
    setModalDueDate(new Date().toISOString().split('T')[0]);
    setModalDueTime('18:00');
    setModalPriority(PRIORITIES.MEDIUM);
    setModalRepeat('None');
    setModalReminder('none');
    setModalError('');
    setIsModalOpen(true);
  };

  // Modal Submit (Save new or updated to-do)
  const handleModalSave = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      setModalError('Title is required');
      return;
    }
    if (!uid) {
      setModalError('User authentication missing');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      let dueAtTimestamp = null;
      let dueDateObj = null;

      if (modalDueDate) {
        const timePart = modalDueTime || '18:00';
        dueDateObj = new Date(`${modalDueDate}T${timePart}:00`);
        if (!isNaN(dueDateObj.getTime())) {
          dueAtTimestamp = Timestamp.fromDate(dueDateObj);
        }
      }

      // If user sets a reminder, ask for notification permission
      if (modalReminder !== 'none') {
        await requestNotificationPermission();
      }

      const remindAtTimestamp = computeRemindAt(dueDateObj, modalReminder);

      if (editingTodo) {
        await updateDoc(doc(db, 'todos', editingTodo.id), {
          title: modalTitle.trim(),
          notes: modalNotes.trim(),
          dueAt: dueAtTimestamp,
          remindAt: remindAtTimestamp,
          priority: modalPriority,
          repeat: modalRepeat,
          reminded: false,
          updatedAt: serverTimestamp()
        });
        showToast('To-do updated');
      } else {
        await addDoc(collection(db, 'todos'), {
          title: modalTitle.trim(),
          notes: modalNotes.trim(),
          dueAt: dueAtTimestamp,
          remindAt: remindAtTimestamp,
          priority: modalPriority,
          repeat: modalRepeat,
          done: false,
          uid,
          linkedTaskId: null,
          reminded: false,
          createdAt: serverTimestamp()
        });
        showToast('To-do created');
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save to-do:', err);
      setModalError('Failed to save to-do. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Priority Pill styling
  const renderPriorityPill = (p) => {
    if (p === PRIORITIES.HIGH) {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          High
        </span>
      );
    }
    if (p === PRIORITIES.LOW) {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          Low
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        Medium
      </span>
    );
  };

  // Render a Single To-Do Row
  const renderTodoRow = (todo) => {
    const isOverdue = !todo.done && todo.dueAtDate && todo.dueAtDate.getTime() < new Date().setHours(0, 0, 0, 0);

    return (
      <div 
        key={todo.id}
        className={`p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group ${
          todo.done 
            ? 'bg-slate-50/70 border-slate-200/80 text-slate-400' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
        }`}
      >
        {/* Left: Checkbox & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => handleToggleDone(todo)}
            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
              todo.done 
                ? 'bg-[#10B981] border-[#10B981] text-white' 
                : 'border-slate-300 hover:border-[#05331F] bg-white'
            }`}
          >
            {todo.done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold truncate ${todo.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                {todo.title}
              </span>
              {renderPriorityPill(todo.priority)}
              {todo.repeat && todo.repeat !== 'None' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <Repeat className="w-3 h-3 text-slate-400" />
                  <span>{todo.repeat}</span>
                </span>
              )}
            </div>

            {/* Notes & Linked Task context */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
              {todo.dueAtDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDisplayDate(todo.dueAtDate)}</span>
                  <span>{formatDisplayTime(todo.dueAtDate)}</span>
                </span>
              )}

              {todo.remindAtDate && (
                <span className="flex items-center gap-1 text-emerald-700">
                  <Bell className="w-3 h-3" />
                  <span>Reminder: {formatDisplayTime(todo.remindAtDate)}</span>
                </span>
              )}

              {todo.linkedTaskId && (
                <button
                  type="button"
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails({ id: todo.linkedTaskId, title: todo.title })}
                  className="flex items-center gap-1 text-[#05331F] hover:underline font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Task #{todo.linkedTaskId.slice(0, 6)}</span>
                  {todo.assignedToName && <span className="text-slate-400">({todo.assignedToName})</span>}
                </button>
              )}

              {todo.notes && !todo.linkedTaskId && (
                <span className="text-slate-400 truncate max-w-xs">{todo.notes}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Overflow Action Menu */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setActiveMenuId(activeMenuId === todo.id ? null : todo.id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {activeMenuId === todo.id && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={() => {
                  openEditModal(todo);
                  setActiveMenuId(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit To-Do</span>
              </button>

              {/* Director Operations: Convert to delegated task */}
              <button
                type="button"
                onClick={() => {
                  handleConvertToTask(todo);
                  setActiveMenuId(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 font-medium"
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Convert to Task</span>
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  handleDelete(todo.id);
                  setActiveMenuId(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-6 z-50 space-y-2">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className="bg-[#05331F] text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200"
            >
              <Bell className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">To-Do & Reminders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your private personal planner {'\u00B7'} Accessible only to you
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>Add To-Do</span>
        </button>
      </div>

      {/* 2. Counter Cards (Click to Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
            activeFilter === 'today'
              ? 'bg-emerald-50/50 border-[#10B981] shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counters.today}</p>
          <p className="text-[11px] text-[#10B981] font-semibold mt-0.5">Due today</p>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
            activeFilter === 'overdue'
              ? 'bg-rose-50/50 border-rose-500 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{counters.overdue}</p>
          <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Requires immediate attention</p>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'all' ? 'all' : 'all')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counters.upcoming}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Scheduled forward</p>
        </div>

        {/* Done */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'done' ? 'all' : 'done')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition ${
            activeFilter === 'done'
              ? 'bg-slate-100 border-slate-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{counters.done}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Finished items</p>
        </div>
      </div>

      {/* 3. Quick-Add Bar */}
      <form onSubmit={handleQuickAdd} className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Quick add a new to-do and press Enter..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="w-full sm:flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
          />
          <input
            type="time"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
          />
          <button
            type="submit"
            disabled={isQuickAdding || !quickTitle.trim()}
            className="px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] disabled:opacity-50 text-white text-xs font-semibold shadow-2xs transition shrink-0"
          >
            Add
          </button>
        </div>
      </form>

      {/* 4. Two-Column Body: Left List & Right Reminders Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main List (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Toolbar: Filter Tabs & Search & Priority */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'today', 'overdue', 'done'].map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveFilter(tabKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    activeFilter === tabKey
                      ? 'bg-[#05331F] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tabKey}
                </button>
              ))}
            </div>

            {/* Search & Priority Filter */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[150px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search to-dos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value={PRIORITIES.HIGH}>High</option>
                <option value={PRIORITIES.MEDIUM}>Medium</option>
                <option value={PRIORITIES.LOW}>Low</option>
              </select>
            </div>
          </div>

          {/* Grouped To-Do Lists */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs">Loading planner...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#10B981]" />
              <p className="font-bold text-slate-800">No to-dos in this view</p>
              <p className="text-xs text-slate-500">Your planner is clear! Click below to create a personal to-do.</p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-300" />
                <span>Add To-Do</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Group: Overdue */}
              {groupedTodos.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Overdue ({groupedTodos.overdue.length})</span>
                  </div>
                  <div className="space-y-2">
                    {groupedTodos.overdue.map(renderTodoRow)}
                  </div>
                </div>
              )}

              {/* Group: Today */}
              {groupedTodos.today.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Calendar className="w-4 h-4 text-[#05331F]" />
                    <span>Today ({groupedTodos.today.length})</span>
                  </div>
                  <div className="space-y-2">
                    {groupedTodos.today.map(renderTodoRow)}
                  </div>
                </div>
              )}

              {/* Group: Upcoming */}
              {groupedTodos.upcoming.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Upcoming ({groupedTodos.upcoming.length})</span>
                  </div>
                  <div className="space-y-2">
                    {groupedTodos.upcoming.map(renderTodoRow)}
                  </div>
                </div>
              )}

              {/* Group: Completed (Collapsible) */}
              {groupedTodos.completed.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCompletedExpanded(prev => !prev)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-600 text-xs font-semibold flex items-center justify-between transition"
                  >
                    <span>Completed ({groupedTodos.completed.length})</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCompletedExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isCompletedExpanded && (
                    <div className="space-y-2 mt-2">
                      {groupedTodos.completed.map(renderTodoRow)}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Reminders Panel (Right column on desktop, below on mobile) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Reminders</h3>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            {/* Today's Reminders */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Today</p>
              {remindersPanelItems.today.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No alarms scheduled for today</p>
              ) : (
                <div className="space-y-2">
                  {remindersPanelItems.today.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => openEditModal(t)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {formatDisplayTime(t.remindAtDate)}
                        </p>
                      </div>
                      <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow's Reminders */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tomorrow</p>
              {remindersPanelItems.tomorrow.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No alarms scheduled for tomorrow</p>
              ) : (
                <div className="space-y-2">
                  {remindersPanelItems.tomorrow.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => openEditModal(t)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDisplayTime(t.remindAtDate)}
                        </p>
                      </div>
                      <Bell className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* 5. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTodo ? 'Edit Personal To-Do' : 'New Personal To-Do'}
                  </h3>
                  <p className="text-xs text-slate-500">Private item on your schedule</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Follow up on factory assembly line maintenance"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Checklist</label>
                <textarea
                  rows="3"
                  placeholder="Optional details, contact points or action items..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
                />
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={modalDueTime}
                    onChange={(e) => setModalDueTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
                  />
                </div>
              </div>

              {/* Reminder & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alarm Reminder</label>
                  <select
                    value={modalReminder}
                    onChange={(e) => setModalReminder(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-[#05331F]"
                  >
                    {REMINDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-[#05331F]"
                  >
                    <option value={PRIORITIES.LOW}>Low</option>
                    <option value={PRIORITIES.MEDIUM}>Medium</option>
                    <option value={PRIORITIES.HIGH}>High</option>
                  </select>
                </div>
              </div>

              {/* Repeat recurrence */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recurrence</label>
                <select
                  value={modalRepeat}
                  onChange={(e) => setModalRepeat(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-[#05331F]"
                >
                  {REPEAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold shadow-2xs transition flex items-center gap-1.5"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingTodo ? 'Save Changes' : 'Create To-Do'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
