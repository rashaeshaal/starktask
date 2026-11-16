import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckSquare, Square, Plus, Trash2, Clock, Calendar, 
  Bell, AlertCircle, CheckCircle2, ChevronDown, Filter, 
  Edit2, ChevronRight, X, AlertTriangle, Search, Repeat,
  CalendarDays, Check
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

export default function TodoReminders({ currentUser: propUser }) {
  const { currentUser: authUser, userProfile } = useAuth();
  // Support both propUser and auth context user
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

  // Toast Notification State
  const [toasts, setToasts] = useState([]);
  const remindedIdsRef = useRef(new Set());

  // Collapsed state for completed group
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // 1. Subscribe to Firestore `todos` collection for current user
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

        // If the reminder is due within the current window and has not fired yet
        if (now >= remindTime && !remindedIdsRef.current.has(todo.id)) {
          remindedIdsRef.current.add(todo.id);

          // Mark in Firestore as reminded
          try {
            await updateDoc(doc(db, 'todos', todo.id), { reminded: true });
          } catch (e) {
            console.error('Failed to update reminded state:', e);
          }

          // Trigger browser notification or in-app toast
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

          // Also show inline toast
          showToast(`Reminder: ${todo.title} is due!`);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [todos]);

  // Request notification permission when user explicitly chooses a reminder
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('Error requesting notification permission:', e);
        }
      }
    }
  };

  const showToast = (message) => {
    const toastId = Date.now() + Math.random();
    setToasts(prev => [...prev, { id: toastId, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 5000);
  };

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // 3. Computed Status Bucket Categorization
  const categorizedTodos = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const overdueList = [];
    const todayList = [];
    const upcomingList = [];
    const doneList = [];

    todos.forEach(todo => {
      if (todo.done) {
        doneList.push(todo);
        return;
      }

      const dueTime = todo.dueAtDate ? todo.dueAtDate.getTime() : null;

      if (!dueTime) {
        todayList.push(todo);
      } else if (dueTime < startOfToday) {
        overdueList.push(todo);
      } else if (dueTime >= startOfToday && dueTime <= endOfToday) {
        todayList.push(todo);
      } else {
        upcomingList.push(todo);
      }
    });

    return {
      overdue: overdueList,
      today: todayList,
      upcoming: upcomingList,
      done: doneList
    };
  }, [todos]);

  // Filtered List for the main view
  const filteredGroups = useMemo(() => {
    const filterItem = (item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes) return false;
      }
      // 2. Priority Filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false;
      }
      return true;
    };

    if (activeFilter === 'today') {
      return {
        overdue: [],
        today: categorizedTodos.today.filter(filterItem),
        upcoming: [],
        done: []
      };
    }
    if (activeFilter === 'overdue') {
      return {
        overdue: categorizedTodos.overdue.filter(filterItem),
        today: [],
        upcoming: [],
        done: []
      };
    }
    if (activeFilter === 'done') {
      return {
        overdue: [],
        today: [],
        upcoming: [],
        done: categorizedTodos.done.filter(filterItem)
      };
    }

    // Default 'all'
    return {
      overdue: categorizedTodos.overdue.filter(filterItem),
      today: categorizedTodos.today.filter(filterItem),
      upcoming: categorizedTodos.upcoming.filter(filterItem),
      done: categorizedTodos.done.filter(filterItem)
    };
  }, [categorizedTodos, activeFilter, searchQuery, priorityFilter]);

  // Reminders for the Right Panel (Upcoming items with remindAt timestamp)
  const reminderPanelItems = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const endOfTomorrow = endOfToday + (24 * 60 * 60 * 1000);

    const todayReminders = [];
    const tomorrowReminders = [];

    todos.forEach(todo => {
      if (todo.done || !todo.remindAtDate) return;
      const rTime = todo.remindAtDate.getTime();

      if (rTime >= startOfToday && rTime <= endOfToday) {
        todayReminders.push(todo);
      } else if (rTime > endOfToday && rTime <= endOfTomorrow) {
        tomorrowReminders.push(todo);
      }
    });

    return {
      today: todayReminders,
      tomorrow: tomorrowReminders
    };
  }, [todos]);

  // 4. Quick Add Handler
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || !uid) return;

    setIsQuickAdding(true);
    try {
      const todayDate = new Date();
      let dueHours = 18;
      let dueMinutes = 0;

      if (quickTime) {
        const [h, m] = quickTime.split(':');
        dueHours = parseInt(h, 10);
        dueMinutes = parseInt(m, 10);
      }

      const dueDateTime = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        todayDate.getDate(),
        dueHours,
        dueMinutes
      );

      await addDoc(collection(db, 'todos'), {
        title: quickTitle.trim(),
        notes: '',
        dueAt: Timestamp.fromDate(dueDateTime),
        remindAt: null,
        priority: PRIORITIES.MEDIUM,
        done: false,
        repeat: 'None',
        uid: uid,
        createdAt: serverTimestamp()
      });

      setQuickTitle('');
      setQuickTime('');
    } catch (err) {
      console.error('Failed to quick add todo:', err);
      alert('Could not save todo: ' + err.message);
    } finally {
      setIsQuickAdding(false);
    }
  };

  // 5. Toggle Done (Handles strike-through & repeating next occurrence)
  const handleToggleDone = async (todo) => {
    const nextDone = !todo.done;

    try {
      // 1. Update this todo status
      await updateDoc(doc(db, 'todos', todo.id), {
        done: nextDone,
        completedAt: nextDone ? serverTimestamp() : null
      });

      // 2. If it was marked done AND it repeats, schedule the next occurrence
      if (nextDone && todo.repeat && todo.repeat !== 'None') {
        const currentDue = todo.dueAtDate || new Date();
        const nextDue = new Date(currentDue.getTime());

        if (todo.repeat === 'Daily') {
          nextDue.setDate(nextDue.getDate() + 1);
        } else if (todo.repeat === 'Weekly') {
          nextDue.setDate(nextDue.getDate() + 7);
        }

        let nextRemindAt = null;
        if (todo.remindAtDate) {
          const diffMs = currentDue.getTime() - todo.remindAtDate.getTime();
          nextRemindAt = Timestamp.fromDate(new Date(nextDue.getTime() - diffMs));
        }

        await addDoc(collection(db, 'todos'), {
          title: todo.title,
          notes: todo.notes || '',
          dueAt: Timestamp.fromDate(nextDue),
          remindAt: nextRemindAt,
          priority: todo.priority || PRIORITIES.MEDIUM,
          done: false,
          repeat: todo.repeat,
          uid: uid,
          createdAt: serverTimestamp()
        });

        showToast(`Next repeat created for ${formatDisplayDate(nextDue)}`);
      }
    } catch (err) {
      console.error('Failed to toggle todo done:', err);
    }
  };

  // 6. Delete Todo
  const handleDeleteTodo = async (todoId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this to-do item?')) return;
    try {
      await deleteDoc(doc(db, 'todos', todoId));
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  // 7. Modal Open for Add / Edit
  const handleOpenAddModal = () => {
    setEditingTodo(null);
    setModalTitle('');
    setModalNotes('');
    setModalDueDate(new Date().toISOString().split('T')[0]);
    setModalDueTime('18:00');
    setModalReminder('none');
    setModalPriority(PRIORITIES.MEDIUM);
    setModalRepeat('None');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (todo, e) => {
    e.stopPropagation();
    setEditingTodo(todo);
    setModalTitle(todo.title || '');
    setModalNotes(todo.notes || '');

    if (todo.dueAtDate) {
      setModalDueDate(todo.dueAtDate.toISOString().split('T')[0]);
      const hours = String(todo.dueAtDate.getHours()).padStart(2, '0');
      const mins = String(todo.dueAtDate.getMinutes()).padStart(2, '0');
      setModalDueTime(`${hours}:${mins}`);
    } else {
      setModalDueDate(new Date().toISOString().split('T')[0]);
      setModalDueTime('18:00');
    }

    // Deduce reminder option
    if (todo.remindAtDate && todo.dueAtDate) {
      const diffMin = Math.round((todo.dueAtDate.getTime() - todo.remindAtDate.getTime()) / (60 * 1000));
      if (diffMin === 0) setModalReminder('at_due');
      else if (diffMin === 10) setModalReminder('10_min');
      else if (diffMin === 60) setModalReminder('1_hour');
      else if (diffMin === 1440) setModalReminder('1_day');
      else setModalReminder('at_due');
    } else {
      setModalReminder('none');
    }

    setModalPriority(todo.priority || PRIORITIES.MEDIUM);
    setModalRepeat(todo.repeat || 'None');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
    setModalError('');
  };

  // 8. Modal Save (Add / Update)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      setModalError('Task title is required.');
      return;
    }

    if (!uid) {
      setModalError('User is not authenticated. Please log in.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      // Build DueAt Date
      const [year, month, day] = modalDueDate.split('-').map(Number);
      const [hours, minutes] = (modalDueTime || '18:00').split(':').map(Number);
      const dueDateTime = new Date(year, month - 1, day, hours, minutes);

      // Ask for notification permission if reminder selected
      if (modalReminder !== 'none') {
        await requestNotificationPermission();
      }

      const remindAtTimestamp = computeRemindAt(dueDateTime, modalReminder);

      if (editingTodo) {
        // Update
        await updateDoc(doc(db, 'todos', editingTodo.id), {
          title: modalTitle.trim(),
          notes: modalNotes.trim(),
          dueAt: Timestamp.fromDate(dueDateTime),
          remindAt: remindAtTimestamp,
          priority: modalPriority,
          repeat: modalRepeat,
          reminded: false,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create
        await addDoc(collection(db, 'todos'), {
          title: modalTitle.trim(),
          notes: modalNotes.trim(),
          dueAt: Timestamp.fromDate(dueDateTime),
          remindAt: remindAtTimestamp,
          priority: modalPriority,
          done: false,
          repeat: modalRepeat,
          uid: uid,
          createdAt: serverTimestamp()
        });
      }

      handleCloseModal();
    } catch (err) {
      console.error('Error saving todo:', err);
      setModalError(err.message || 'Failed to save to-do item.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const getPriorityPill = (priority) => {
    const p = (priority || 'Medium').toLowerCase();
    if (p === 'high' || p === 'urgent' || p === 'critical') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">High</span>;
    }
    if (p === 'low') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
  };

  // If user is not logged in
  if (!uid && !loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 max-w-xl mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-800 text-base">Authentication Required</h3>
        <p className="text-xs text-slate-500 mt-1">Please log in to access your personal To-Do & Reminders planner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans select-none">
      
      {/* INLINE TOAST CONTAINER */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="pointer-events-auto bg-[#05331F] text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center gap-2.5 text-xs animate-in slide-in-from-top-3 duration-200"
          >
            <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#05331F] tracking-tight">To-Do & Reminders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your personal planner</p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#05331F]/30"
          aria-label="Add new to-do task"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>+ Add To-Do</span>
        </button>
      </div>

      {/* 2. FOUR COUNTER CARDS (Today, Overdue, Upcoming, Done) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today */}
        <button
          type="button"
          onClick={() => setActiveFilter('today')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            activeFilter === 'today'
              ? 'border-[#10B981] ring-1 ring-[#10B981]/50 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
          aria-label="Filter by tasks due today"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {categorizedTodos.today.length}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Due today</div>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => setActiveFilter('overdue')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
            activeFilter === 'overdue'
              ? 'border-rose-400 ring-1 ring-rose-400/50 bg-rose-50/20'
              : 'border-slate-200 hover:border-rose-300'
          }`}
          aria-label="Filter by overdue tasks"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {categorizedTodos.overdue.length}
          </div>
          <div className={`text-xs mt-1 font-medium ${categorizedTodos.overdue.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {categorizedTodos.overdue.length > 0 ? 'Requires action' : 'None overdue'}
          </div>
        </button>

        {/* Upcoming */}
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-400/20 ${
            activeFilter === 'all'
              ? 'border-slate-400 ring-1 ring-slate-400/50 bg-slate-50/40'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          aria-label="Filter all upcoming tasks"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {categorizedTodos.upcoming.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Future deadlines</div>
        </button>

        {/* Done */}
        <button
          type="button"
          onClick={() => setActiveFilter('done')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            activeFilter === 'done'
              ? 'border-[#05331F] ring-1 ring-[#05331F]/50 bg-emerald-50/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          aria-label="Filter completed tasks"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Done</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#05331F]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {categorizedTodos.done.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Completed items</div>
        </button>

      </div>

      {/* 3. QUICK-ADD BAR (Enter saves, defaults to today) */}
      <form 
        onSubmit={handleQuickAdd}
        className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-2.5"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            required
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="What do you need to do today? (Press Enter to save)"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 focus:border-[#05331F]"
            aria-label="Quick add task title"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="time"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#05331F] min-h-[40px] sm:min-h-0"
            aria-label="Optional due time"
          />

          <button
            type="submit"
            disabled={!quickTitle.trim() || isQuickAdding}
            className="px-4 py-2 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer min-h-[40px] sm:min-h-0 whitespace-nowrap"
          >
            {isQuickAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {/* 4. TWO-COLUMN BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: MAIN LIST (lg: col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls: Filter Tabs + Search + Priority Dropdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Filter Tabs (All / Today / Overdue / Done) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'done', label: 'Done' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                    activeFilter === tab.id
                      ? 'bg-[#05331F] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box & Priority Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search to-dos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
                aria-label="Filter by priority"
              >
                <option value="all">Priority (All)</option>
                <option value={PRIORITIES.HIGH}>High</option>
                <option value={PRIORITIES.MEDIUM}>Medium</option>
                <option value={PRIORITIES.LOW}>Low</option>
              </select>
            </div>
          </div>

          {/* Todo Items Groups */}
          <div className="space-y-4">
            
            {/* 1. OVERDUE GROUP */}
            {filteredGroups.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full">
                    {filteredGroups.overdue.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredGroups.overdue.map(todo => renderTodoRow(todo))}
                </div>
              </div>
            )}

            {/* 2. TODAY GROUP */}
            {filteredGroups.today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-[#05331F] uppercase tracking-wider">Today</span>
                  <span className="text-[10px] bg-emerald-100 text-[#05331F] font-bold px-1.5 py-0.2 rounded-full">
                    {filteredGroups.today.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredGroups.today.map(todo => renderTodoRow(todo))}
                </div>
              </div>
            )}

            {/* 3. UPCOMING GROUP */}
            {filteredGroups.upcoming.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
                    {filteredGroups.upcoming.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredGroups.upcoming.map(todo => renderTodoRow(todo))}
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {filteredGroups.overdue.length === 0 && 
             filteredGroups.today.length === 0 && 
             filteredGroups.upcoming.length === 0 && 
             filteredGroups.done.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#05331F] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">No to-do tasks found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeFilter === 'done' ? 'You have no completed items yet.' : 'All clear! Add a task to plan your day.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#05331F] hover:bg-[#07472B] text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add To-Do</span>
                </button>
              </div>
            )}

            {/* 4. COMPLETED GROUP (Collapsed at the bottom) */}
            {filteredGroups.done.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Completed Items ({filteredGroups.done.length})</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCompletedExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isCompletedExpanded && (
                  <div className="space-y-2 mt-2 pt-1">
                    {filteredGroups.done.map(todo => renderTodoRow(todo))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: REMINDERS PANEL */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Reminders</h2>
            </div>

            {reminderPanelItems.today.length === 0 && reminderPanelItems.tomorrow.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No scheduled reminders for today or tomorrow.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Today's reminders */}
                {reminderPanelItems.today.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today</span>
                    <div className="space-y-2">
                      {reminderPanelItems.today.map(todo => (
                        <div 
                          key={todo.id}
                          className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/80 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">{todo.title}</p>
                            <span className="text-[10px] text-emerald-800 font-medium">Due at {formatDisplayTime(todo.dueAtDate)}</span>
                          </div>
                          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                            <Bell className="w-3 h-3" />
                            <span>{formatDisplayTime(todo.remindAtDate)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tomorrow's reminders */}
                {reminderPanelItems.tomorrow.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tomorrow</span>
                    <div className="space-y-2">
                      {reminderPanelItems.tomorrow.map(todo => (
                        <div 
                          key={todo.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 truncate">{todo.title}</p>
                            <span className="text-[10px] text-slate-500">Due at {formatDisplayTime(todo.dueAtDate)}</span>
                          </div>
                          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                            <Bell className="w-3 h-3 text-slate-400" />
                            <span>{formatDisplayTime(todo.remindAtDate)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>

      {/* FULL ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#05331F]">
                {editingTodo ? 'Edit To-Do' : 'Add New To-Do'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              
              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Call supplier regarding hinge specifications"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 focus:border-[#05331F]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or checklist..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 focus:border-[#05331F]"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={modalDueTime}
                    onChange={(e) => setModalDueTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#05331F]"
                  />
                </div>
              </div>

              {/* Reminder & Repeat Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reminder</label>
                  <select
                    value={modalReminder}
                    onChange={(e) => setModalReminder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#05331F]"
                  >
                    {REMINDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Repeat</label>
                  <select
                    value={modalRepeat}
                    onChange={(e) => setModalRepeat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#05331F]"
                  >
                    {REPEAT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {[PRIORITIES.LOW, PRIORITIES.MEDIUM, PRIORITIES.HIGH].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setModalPriority(p)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                        modalPriority === p
                          ? 'bg-[#05331F] text-white border-[#05331F] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {modalSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

  // Todo row renderer
  function renderTodoRow(todo) {
    const isDone = Boolean(todo.done);

    return (
      <div
        key={todo.id}
        className={`group p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white shadow-xs hover:border-slate-300 ${
          isDone ? 'opacity-60 bg-slate-50/70 border-slate-100' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Checkbox */}
          <button
            type="button"
            onClick={() => handleToggleDone(todo)}
            className="p-0.5 text-slate-400 hover:text-[#05331F] transition cursor-pointer shrink-0 focus:outline-none"
            aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isDone ? (
              <CheckSquare className="w-5 h-5 text-[#10B981]" />
            ) : (
              <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            )}
          </button>

          {/* Title & Notes */}
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold text-slate-900 truncate ${
              isDone ? 'line-through text-slate-400 font-normal' : ''
            }`}>
              {todo.title}
            </p>
            {todo.notes && (
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {todo.notes}
              </p>
            )}
          </div>
        </div>

        {/* Badges & Meta */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Priority Pill */}
          {getPriorityPill(todo.priority)}

          {/* Due date & time */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium whitespace-nowrap">
            <CalendarDays className="w-3 h-3 text-slate-400" />
            <span>{formatDisplayDate(todo.dueAtDate)}</span>
            {todo.dueAtDate && (
              <span className="text-slate-400">({formatDisplayTime(todo.dueAtDate)})</span>
            )}
          </div>

          {/* Reminder Bell Indicator */}
          {todo.remindAtDate && (
            <span 
              className="p-1 text-emerald-700 bg-emerald-50 rounded-lg" 
              title={`Reminder set for ${formatDisplayTime(todo.remindAtDate)}`}
            >
              <Bell className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Repeat Indicator */}
          {todo.repeat && todo.repeat !== 'None' && (
            <span 
              className="p-1 text-slate-500 bg-slate-100 rounded-lg" 
              title={`Repeats ${todo.repeat}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Edit & Delete on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleOpenEditModal(todo, e)}
              className="p-1 text-slate-400 hover:text-[#05331F] rounded-lg transition hover:bg-slate-100"
              aria-label="Edit todo"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteTodo(todo.id, e)}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition hover:bg-rose-50"
              aria-label="Delete todo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  }
}
