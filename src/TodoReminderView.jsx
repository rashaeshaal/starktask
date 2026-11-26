import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckSquare, Square, Plus, Trash2, Clock, Calendar, 
  Bell, AlertCircle, CheckCircle2, Star, Tag, ChevronDown, Filter, Sparkles,
  Edit2, ChevronRight, ChevronLeft, ArrowRight, CornerDownRight, RotateCcw,
  AlertTriangle, Phone, DollarSign, UserCheck, ShieldCheck, FileText, Send, X,
  CalendarDays, Bookmark, MoreVertical, Check, Volume2, AlarmClock, Lock,
  Search, ExternalLink, Flame, CheckCheck, RefreshCw, Eye
} from 'lucide-react';
import { getTodayDateString } from './dateUtils';
import { db } from './firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, serverTimestamp 
} from 'firebase/firestore';
import { useToast } from './ToastContext';

export const CATEGORY_OPTIONS = [
  { id: 'Work', label: 'Work', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-600' },
  { id: 'Follow-up', label: 'Follow-up', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'Meeting', label: 'Meeting', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-600' },
  { id: 'Personal', label: 'Personal', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600' },
  { id: 'Administration', label: 'Administration / QC', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' }
];

export const PRIORITY_CONFIG = {
  Critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  High: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  Medium: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  Low: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-300' }
};

export default function TodoReminderView({ 
  currentUser, 
  departments = [], 
  employees = [],
  onConvertToOfficialTask 
}) {
  const { showToast, confirm } = useToast();
  const todayStr = getTodayDateString();
  const userId = currentUser?.id || currentUser?.uid || currentUser?.employeeId || 'default_user';
  const userStorageKey = `stark_employee_planner_${userId}`;

  // Loading & syncing states
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'

  // State: To-Dos list (Pure live data from localStorage / Firestore - zero hardcoded items)
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean out any previously injected sample/init items if they exist in cache
          return parsed.filter(t => !String(t.id).startsWith('todo_init_'));
        }
      }
    } catch (e) {
      console.warn('Storage read failed', e);
    }
    return [];
  });

  // Local Storage synchronization
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(todos));
    } catch (e) {
      console.warn('Planner storage sync error:', e);
    }
  }, [todos, userStorageKey]);

  // Firestore Real-time Synchronization (Isolated collection scoped by userId)
  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    setSyncStatus('syncing');
    try {
      const todosQuery = query(
        collection(db, 'personal_todos'),
        where('userId', '==', userId)
      );

      const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
        const remoteList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTodos(remoteList);
        setSyncStatus('synced');
        setLoading(false);
      }, (err) => {
        console.info('Personal To-Do offline storage active:', err.message);
        setSyncStatus('offline');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.info('Firestore hook note:', e);
      setSyncStatus('offline');
      setLoading(false);
    }
  }, [userId]);

  // Active view filters
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'overdue' | 'starred' | 'completed' | 'all'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add State (Inline modern creation)
  const [showQuickAddExpanded, setShowQuickAddExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Work');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newDueDate, setNewDueDate] = useState(todayStr);
  const [newDueTime, setNewDueTime] = useState('04:00 PM');
  const [newReminderDate, setNewReminderDate] = useState(todayStr);
  const [newReminderTime, setNewReminderTime] = useState('03:45 PM');
  const [newRecurrence, setNewRecurrence] = useState('none');
  const [newNotes, setNewNotes] = useState('');
  const [enableReminder, setEnableReminder] = useState(true);

  // Edit State & Modal
  const [editingTodo, setEditingTodo] = useState(null);

  // Conversion Confirmation Modal State
  const [convertingTodo, setConvertingTodo] = useState(null);

  // Dropdown Action Menu State (tracking open item menu)
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Notification Banner & Audio Engine
  const [activeAlertReminder, setActiveAlertReminder] = useState(null);

  // Audio Chime (Synthesized gentle pleasant web audio notification chime)
  const playReminderChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio chime note:', e);
    }
  };

  // Browser Notification Permission Handler
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('Reminder alerts enabled on this device.', 'success');
        playReminderChime();
        new Notification('STARK STEEL - Personal Planner', {
          body: 'Planner reminder alerts enabled on this device.',
          icon: '/favicon.ico'
        });
      } else {
        showToast('Notification permission was not granted.', 'warning');
      }
    } else {
      showToast('Notifications are not supported in this browser.', 'info');
    }
  };

  // Periodic Reminder Checker (runs every 30 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentDateStr = getTodayDateString();

      todos.forEach(todo => {
        if (!todo.completed && todo.reminderActive && (todo.reminderDate === currentDateStr || todo.dueDate === currentDateStr) && (todo.reminderTime || todo.dueTime)) {
          const timeToParse = todo.reminderTime || todo.dueTime;
          const parts = timeToParse.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (parts) {
            let h = parseInt(parts[1], 10);
            const m = parseInt(parts[2], 10);
            const period = parts[3].toUpperCase();
            if (period === 'PM' && h < 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;

            const diffMinutes = (h * 60 + m) - (currentHours * 60 + currentMinutes);
            if (diffMinutes === 0 && !todo.lastTriggeredAt) {
              setActiveAlertReminder(todo);
              playReminderChime();

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Reminder: ${todo.title}`, {
                  body: `Scheduled for ${timeToParse} [${todo.priority} Priority].`,
                  icon: '/favicon.ico'
                });
              }
              updateTodoItem(todo.id, { lastTriggeredAt: now.toISOString() });
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [todos]);

  // DB Sync Helper
  const syncToFirestore = async (item, action = 'set') => {
    if (!db) return;
    try {
      const docRef = doc(db, 'personal_todos', item.id);
      if (action === 'delete') {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { ...item, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) {
      setSyncStatus('offline');
    }
  };

  // Create new task
  const handleCreateTodo = (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem = {
      id: `todo_${Date.now()}`,
      userId,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      dueDate: newDueDate || todayStr,
      dueTime: newDueTime || '',
      reminderDate: enableReminder ? (newReminderDate || newDueDate || todayStr) : '',
      reminderTime: enableReminder ? (newReminderTime || newDueTime || '') : '',
      recurrence: newRecurrence,
      notes: newNotes.trim(),
      completed: false,
      reminderActive: enableReminder,
      starred: false,
      createdAt: new Date().toISOString()
    };

    setTodos(prev => [newItem, ...prev]);
    syncToFirestore(newItem, 'set');
    showToast('To-Do added to your planner', 'success');

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewNotes('');
    setShowQuickAddExpanded(false);
  };

  // Update item
  const updateTodoItem = (id, updates) => {
    setTodos(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      const target = updated.find(t => t.id === id);
      if (target) syncToFirestore(target, 'set');
      return updated;
    });
  };

  // Delete item with confirm
  const handleDeleteTodo = async (id, e) => {
    if (e) e.stopPropagation();
    const item = todos.find(t => t.id === id);
    if (!item) return;

    const ok = await confirm({
      title: 'Delete To-Do',
      message: `Are you sure you want to delete "${item.title}"?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!ok) return;

    setTodos(prev => prev.filter(t => t.id !== id));
    syncToFirestore(item, 'delete');
    if (editingTodo?.id === id) setEditingTodo(null);
    showToast('To-Do deleted', 'info');
  };

  // Toggle Complete
  const handleToggleComplete = (id, e) => {
    if (e) e.stopPropagation();
    const item = todos.find(t => t.id === id);
    if (!item) return;

    const nextCompleted = !item.completed;
    
    // Auto-create next recurrence if applicable
    if (nextCompleted && item.recurrence && item.recurrence !== 'none') {
      const currDue = new Date(item.dueDate || todayStr);
      let nextDue = new Date(currDue);
      if (item.recurrence === 'daily') nextDue.setDate(nextDue.getDate() + 1);
      if (item.recurrence === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
      if (item.recurrence === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);

      const nextDueStr = nextDue.toISOString().split('T')[0];
      const recurringClone = {
        ...item,
        id: `todo_${Date.now()}`,
        completed: false,
        dueDate: nextDueStr,
        reminderDate: nextDueStr,
        createdAt: new Date().toISOString()
      };
      setTodos(prev => [recurringClone, ...prev]);
      syncToFirestore(recurringClone, 'set');
    }

    updateTodoItem(id, { 
      completed: nextCompleted, 
      completedAt: nextCompleted ? new Date().toISOString() : null 
    });

    showToast(nextCompleted ? 'Task completed! Great job.' : 'Task reopened', 'success');
  };

  // Snooze reminder helper
  const handleSnooze = (id, minutes = 15) => {
    const item = todos.find(t => t.id === id);
    if (!item) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayH = (hours % 12 || 12).toString().padStart(2, '0');
    const snoozedTime = `${displayH}:${mins} ${ampm}`;
    
    updateTodoItem(id, { 
      dueTime: snoozedTime, 
      reminderTime: snoozedTime, 
      lastTriggeredAt: null 
    });
    setActiveAlertReminder(null);
    showToast(`Reminder snoozed for ${minutes} minutes (${snoozedTime})`, 'info');
  };

  // Star toggle
  const handleToggleStar = (id, e) => {
    if (e) e.stopPropagation();
    const item = todos.find(t => t.id === id);
    if (!item) return;
    updateTodoItem(id, { starred: !item.starred });
  };

  // Confirm and Convert to Official Task
  const handleExecuteConvert = () => {
    if (!convertingTodo) return;
    if (onConvertToOfficialTask) {
      onConvertToOfficialTask({
        title: convertingTodo.title,
        description: `${convertingTodo.description || ''}\n\n[Converted from Personal Planner: ${convertingTodo.notes || 'No extra notes'}]`,
        priority: convertingTodo.priority?.toUpperCase() || 'MEDIUM',
        deadlineDate: convertingTodo.dueDate || todayStr
      });
      showToast('Personal To-Do converted to official corporate task!', 'success');
    }
    setConvertingTodo(null);
  };

  // Productivity Summary Statistics (Calculated directly from actual records)
  const stats = useMemo(() => {
    const todayList = todos.filter(t => t.dueDate === todayStr);
    const todayTasks = todayList.length;
    const completedToday = todayList.filter(t => t.completed).length;
    const pendingToday = todayList.filter(t => !t.completed).length;
    const highCriticalToday = todayList.filter(t => (t.priority === 'Critical' || t.priority === 'High') && !t.completed).length;
    const overdue = todos.filter(t => t.dueDate < todayStr && !t.completed).length;
    const completionPercent = todayTasks > 0 ? Math.round((completedToday / todayTasks) * 100) : 0;

    return {
      todayTasks,
      completedToday,
      pendingToday,
      highCriticalToday,
      overdue,
      completionPercent
    };
  }, [todos, todayStr]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      today: todos.filter(t => t.dueDate === todayStr && !t.completed).length,
      upcoming: todos.filter(t => t.dueDate > todayStr && !t.completed).length,
      overdue: todos.filter(t => t.dueDate < todayStr && !t.completed).length,
      starred: todos.filter(t => t.starred && !t.completed).length,
      completed: todos.filter(t => t.completed).length,
      all: todos.length
    };
  }, [todos, todayStr]);

  // Filtered & Sorted To-Dos
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = (t.title || '').toLowerCase().includes(q);
        const mDesc = (t.description || '').toLowerCase().includes(q);
        const mNotes = (t.notes || '').toLowerCase().includes(q);
        if (!mTitle && !mDesc && !mNotes) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && t.category !== selectedCategoryFilter) {
        return false;
      }

      // Tab filter
      if (activeTab === 'today') {
        return t.dueDate === todayStr;
      }
      if (activeTab === 'upcoming') {
        return t.dueDate > todayStr && !t.completed;
      }
      if (activeTab === 'overdue') {
        return t.dueDate < todayStr && !t.completed;
      }
      if (activeTab === 'starred') {
        return t.starred && !t.completed;
      }
      if (activeTab === 'completed') {
        return t.completed;
      }
      if (activeTab === 'date') {
        return t.dueDate === selectedCalendarDate;
      }
      return true; // 'all'
    }).sort((a, b) => {
      // Completed items drop to bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Overdue items surface to top
      const isOverdueA = a.dueDate < todayStr;
      const isOverdueB = b.dueDate < todayStr;
      if (isOverdueA !== isOverdueB) return isOverdueA ? -1 : 1;
      // Starred items next
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      // Priority weighting
      const prioOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const diffPrio = (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0);
      if (diffPrio !== 0) return diffPrio;
      // Time of day
      return (a.dueTime || '').localeCompare(b.dueTime || '');
    });
  }, [todos, activeTab, selectedCategoryFilter, selectedCalendarDate, searchQuery, todayStr]);

  // Horizontal Interactive Calendar Strip Days (-3 to +10 days around selected date)
  const calendarStripDays = useMemo(() => {
    const center = new Date(selectedCalendarDate || todayStr);
    const days = [];
    for (let offset = -4; offset <= 9; offset++) {
      const d = new Date(center);
      d.setDate(d.getDate() + offset);
      const dStr = d.toISOString().split('T')[0];
      const itemsForDay = todos.filter(t => t.dueDate === dStr);
      days.push({
        dateObj: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedCalendarDate,
        hasTasks: itemsForDay.length > 0,
        pendingCount: itemsForDay.filter(t => !t.completed).length,
        hasCritical: itemsForDay.some(t => t.priority === 'Critical' && !t.completed)
      });
    }
    return days;
  }, [selectedCalendarDate, todos, todayStr]);

  const handlePrevDay = () => {
    const d = new Date(selectedCalendarDate || todayStr);
    d.setDate(d.getDate() - 1);
    setSelectedCalendarDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedCalendarDate || todayStr);
    d.setDate(d.getDate() + 1);
    setSelectedCalendarDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 font-sans text-[#172B4D]">
      
      {/* ACTIVE SCHEDULED REMINDER NOTIFICATION BANNER */}
      {activeAlertReminder && (
        <div className="bg-[#05331F] text-white p-4 rounded-2xl shadow-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0">
              <AlarmClock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="truncate">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>SCHEDULED REMINDER ALERT</span>
                <span className="text-white/60">• {activeAlertReminder.reminderTime || activeAlertReminder.dueTime}</span>
              </div>
              <div className="text-sm font-semibold text-white truncate">{activeAlertReminder.title}</div>
              <div className="text-xs text-emerald-200/80 truncate">
                {activeAlertReminder.category} • {activeAlertReminder.priority} Priority
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => handleSnooze(activeAlertReminder.id, 15)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition cursor-pointer"
            >
              Snooze 15m
            </button>
            <button
              onClick={() => {
                handleToggleComplete(activeAlertReminder.id);
                setActiveAlertReminder(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#34D399] text-[#05331F] hover:bg-emerald-300 text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Done</span>
            </button>
            <button
              onClick={() => setActiveAlertReminder(null)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. PAGE INTRODUCTION & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">My Planner</h1>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-200">
              Personal Workspace
            </span>
            {syncStatus === 'syncing' && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                Offline Cache
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Organize your day, manage follow-ups and never miss an important reminder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Permission Trigger */}
          <button
            onClick={requestNotificationPermission}
            title="Enable Audio & Desktop Alerts"
            className="h-9 px-3 bg-white hover:bg-slate-50 border border-[#E5EAF0] text-slate-600 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Alerts</span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => setShowQuickAddExpanded(prev => !prev)}
            className="h-9 px-4 rounded-xl bg-[#05331F] hover:bg-[#0A422B] active:bg-[#032214] text-white text-xs font-semibold transition flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#34D399]" />
            <span>+ Add To-Do</span>
          </button>
        </div>
      </div>

      {/* 3. DAILY PRODUCTIVITY SUMMARY (4 REFINED KPI CARDS) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Today's Due */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5EAF0] shadow-2xs flex items-center justify-between transition-all hover:border-slate-300">
            <div>
              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Today's Due</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#172B4D] mt-0.5">{stats.todayTasks}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Scheduled for today</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-[#E5EAF0] text-[#05331F] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          {/* 2. Completed */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5EAF0] shadow-2xs flex items-center justify-between transition-all hover:border-emerald-200">
            <div>
              <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Completed</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-0.5">{stats.completedToday}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">{stats.completionPercent}% finished today</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* 3. Pending */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5EAF0] shadow-2xs flex items-center justify-between transition-all hover:border-blue-200">
            <div>
              <div className="text-[10px] font-semibold text-[#4F7CAC] uppercase tracking-wider">Pending</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#4F7CAC] mt-0.5">{stats.pendingToday}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Awaiting completion</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50/70 border border-blue-100 text-[#4F7CAC] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4 text-[#4F7CAC]" />
            </div>
          </div>

          {/* 4. High / Critical Priority */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E5EAF0] shadow-2xs flex items-center justify-between transition-all hover:border-amber-200">
            <div>
              <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">High / Critical</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 mt-0.5">{stats.highCriticalToday}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Priority focus items</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Daily Completion Progress Bar */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-[#E5EAF0] shadow-2xs flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#172B4D]">Daily Progress</span>
              <span className="font-mono text-xs text-[#64748B]">
                {stats.completedToday} of {stats.todayTasks} completed ({stats.todayTasks - stats.completedToday} remaining)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, stats.completionPercent)}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
            {stats.completionPercent}%
          </span>
        </div>
      </div>

      {/* 4. MODERN INLINE QUICK ADD SECTION */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xs p-4 space-y-3">
        <form onSubmit={handleCreateTodo} className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done? Type and press Enter or customize below..."
              className="flex-1 bg-slate-50 border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#4F7CAC] focus:ring-2 focus:ring-[#4F7CAC]/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowQuickAddExpanded(prev => !prev)}
              className={`h-10 px-3 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                showQuickAddExpanded 
                  ? 'bg-slate-100 text-[#172B4D] border-slate-300' 
                  : 'bg-white hover:bg-slate-50 text-[#64748B] border-[#E5EAF0]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Details</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickAddExpanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="h-10 px-4 bg-[#05331F] disabled:bg-slate-200 hover:bg-[#0A422B] text-white text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 text-[#34D399]" />
              <span>Add</span>
            </button>
          </div>

          {/* Expandable Secondary Details */}
          {showQuickAddExpanded && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                >
                  <option value="Work">Work</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Personal">Personal</option>
                  <option value="Administration">Administration / QC</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Due Time</label>
                <input
                  type="text"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional brief description or agenda..."
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Recurrence</label>
                <select
                  value={newRecurrence}
                  onChange={(e) => setNewRecurrence(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2 text-xs focus:bg-white focus:outline-hidden focus:border-[#4F7CAC]"
                >
                  <option value="none">None (One-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="enableReminderCheck"
                  checked={enableReminder}
                  onChange={(e) => setEnableReminder(e.target.checked)}
                  className="w-4 h-4 accent-[#05331F] rounded cursor-pointer"
                />
                <label htmlFor="enableReminderCheck" className="text-xs font-semibold text-[#172B4D] cursor-pointer flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Set Audio Reminder</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 7. INTERACTIVE HORIZONTAL CALENDAR STRIP */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5EAF0] shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-800" />
            <h3 className="text-xs font-bold text-[#172B4D]">
              {new Date(selectedCalendarDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            {selectedCalendarDate !== todayStr && (
              <button
                onClick={() => {
                  setSelectedCalendarDate(todayStr);
                  setActiveTab('today');
                }}
                className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                Return to Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Date Cards */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {calendarStripDays.map((d, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedCalendarDate(d.dateStr);
                setActiveTab(d.isToday ? 'today' : 'date');
              }}
              className={`w-14 py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition shrink-0 cursor-pointer ${
                d.isSelected
                  ? 'bg-[#05331F] text-white border-[#05331F] shadow-xs'
                  : d.isToday
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                  : 'bg-white hover:bg-slate-50 border-[#E5EAF0] text-slate-700'
              }`}
            >
              <span className={`text-[10px] uppercase font-mono tracking-wider ${d.isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                {d.dayName}
              </span>
              <span className="text-sm font-bold font-mono my-0.5">
                {d.dayNum}
              </span>
              <div className="h-1.5 flex items-center justify-center">
                {d.hasTasks && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    d.isSelected 
                      ? 'bg-[#34D399]' 
                      : d.hasCritical 
                      ? 'bg-rose-500' 
                      : 'bg-emerald-600'
                  }`} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 6 & 9. VIEW NAVIGATION (SEGMENTED TABS) & CATEGORY FILTERS */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5EAF0] pb-2">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: 'Today', count: tabCounts.today },
              { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
              { id: 'overdue', label: 'Overdue', count: tabCounts.overdue },
              { id: 'starred', label: 'Starred', count: tabCounts.starred },
              { id: 'completed', label: 'Completed', count: tabCounts.completed },
              { id: 'all', label: 'All Items', count: tabCounts.all }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#05331F] text-white shadow-2xs' 
                      : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : tab.id === 'overdue' 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search to-dos..."
                className="h-8 pl-8 pr-3 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#172B4D] placeholder-slate-400 focus:outline-hidden focus:border-[#4F7CAC] w-36 sm:w-44"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="h-8 bg-white border border-[#E5EAF0] text-[#172B4D] text-xs rounded-xl px-2.5 focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              <option value="Work">Work</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Meeting">Meeting</option>
              <option value="Personal">Personal</option>
              <option value="Administration">Administration / QC</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8. TASK LIST DESIGN (POLISHED PRODUCTIVITY ROWS) */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xs overflow-hidden">
        {loading ? (
          // Skeleton Loader
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 bg-slate-200 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          // 12. Context-Aware Empty State
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172B4D]">
                {activeTab === 'today' ? "No tasks due today" :
                 activeTab === 'upcoming' ? "No upcoming tasks" :
                 activeTab === 'overdue' ? "No overdue tasks" :
                 activeTab === 'starred' ? "No starred tasks" :
                 activeTab === 'completed' ? "No completed tasks yet" :
                 "No tasks found"}
              </h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
                {activeTab === 'today' ? "You're all caught up for today! Use the quick-add bar above to plan new work." :
                 "Try adjusting your filters or create a new item to get organized."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTodos.map((todo) => {
              const isOverdue = todo.dueDate < todayStr && !todo.completed;
              const prioConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.Medium;
              const categoryMatch = CATEGORY_OPTIONS.find(c => c.id === todo.category);

              return (
                <div
                  key={todo.id}
                  className={`p-3.5 sm:px-4 transition flex items-start justify-between gap-3 group hover:bg-slate-50/70 ${
                    todo.completed 
                      ? 'bg-slate-50/40 text-slate-400' 
                      : isOverdue 
                      ? 'bg-rose-50/20' 
                      : 'bg-white'
                  }`}
                >
                  {/* Left: Completion Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(todo.id, e)}
                    className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center transition shrink-0 cursor-pointer ${
                      todo.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-emerald-600 bg-white'
                    }`}
                    title={todo.completed ? 'Mark Incomplete' : 'Mark Complete'}
                  >
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>

                  {/* Middle: Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold leading-snug ${
                        todo.completed ? 'line-through text-slate-400' : 'text-[#172B4D]'
                      }`}>
                        {todo.title}
                      </span>

                      {/* Category Pill */}
                      {todo.category && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          categoryMatch 
                            ? `${categoryMatch.bg} ${categoryMatch.text} ${categoryMatch.border}` 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {todo.category}
                        </span>
                      )}

                      {/* Priority Tag */}
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${prioConfig.bg} ${prioConfig.text} ${prioConfig.border}`}>
                        {todo.priority}
                      </span>

                      {/* Recurrence Indicator */}
                      {todo.recurrence && todo.recurrence !== 'none' && (
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ↻ {todo.recurrence}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {todo.description && (
                      <p className="text-[11px] text-[#64748B] line-clamp-1">
                        {todo.description}
                      </p>
                    )}

                    {/* Metadata: Due Date, Time, Reminder */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{todo.dueDate}</span>
                        {todo.dueTime && <span>• {todo.dueTime}</span>}
                      </span>

                      {isOverdue && (
                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          OVERDUE
                        </span>
                      )}

                      {todo.reminderActive && (
                        <span className="text-amber-700 flex items-center gap-1 text-[11px]">
                          <Bell className="w-3 h-3 text-amber-600" />
                          <span>Reminder {todo.reminderTime || todo.dueTime}</span>
                        </span>
                      )}

                      {todo.notes && (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]" title={todo.notes}>
                          <FileText className="w-3 h-3" />
                          <span>Notes</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Star toggle */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(todo.id, e)}
                      title={todo.starred ? "Unstar" : "Star item"}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        todo.starred 
                          ? 'text-amber-500 hover:bg-amber-50' 
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${todo.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Convert to Official Task */}
                    <button
                      type="button"
                      onClick={() => setConvertingTodo(todo)}
                      title="Convert to Official Enterprise Task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    {/* More Actions Dropdown Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === todo.id ? null : todo.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === todo.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-44 bg-white border border-[#E5EAF0] rounded-xl shadow-lg py-1 text-xs text-[#172B4D] animate-in fade-in duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTodo(todo);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSnooze(todo.id, 15);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Snooze (+15m)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConvertingTodo(todo);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Convert to Task</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1" />

                          <button
                            type="button"
                            onClick={(e) => {
                              handleDeleteTodo(todo.id, e);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 11. CONVERT TO OFFICIAL TASK CONFIRMATION MODAL */}
      {convertingTodo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172B4D]">Convert to Official Task</h3>
                  <p className="text-[11px] text-[#64748B]">Escalate to enterprise task tracking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingTodo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-semibold text-[#172B4D]">{convertingTodo.title}</p>
              {convertingTodo.description && (
                <p className="text-slate-500 text-[11px]">{convertingTodo.description}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span>Priority: {convertingTodo.priority}</span>
                <span>•</span>
                <span>Due: {convertingTodo.dueDate}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Converting this personal to-do will open the official Corporate Task Assignment modal with this title and details pre-populated.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingTodo(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConvert}
                className="px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#0A422B] text-white font-semibold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Open Task Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTodo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#172B4D]">Edit Personal To-Do</h3>
              <button
                type="button"
                onClick={() => setEditingTodo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateTodoItem(editingTodo.id, editingTodo);
                setEditingTodo(null);
                showToast('To-Do updated successfully', 'success');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Category</label>
                  <select
                    value={editingTodo.category}
                    onChange={(e) => setEditingTodo({ ...editingTodo, category: e.target.value })}
                    className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl px-2.5 py-2 text-xs"
                  >
                    <option value="Work">Work</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Personal">Personal</option>
                    <option value="Administration">Administration / QC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Priority</label>
                  <select
                    value={editingTodo.priority}
                    onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl px-2.5 py-2 text-xs"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTodo.dueDate}
                    onChange={(e) => setEditingTodo({ ...editingTodo, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl px-2.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Due Time</label>
                  <input
                    type="text"
                    value={editingTodo.dueTime || ''}
                    onChange={(e) => setEditingTodo({ ...editingTodo, dueTime: e.target.value })}
                    placeholder="e.g. 10:30 AM"
                    className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Notes / Description</label>
                <textarea
                  rows="3"
                  value={editingTodo.description || ''}
                  onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                  className="w-full bg-slate-50 border border-[#E5EAF0] rounded-xl p-2.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#0A422B] text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
