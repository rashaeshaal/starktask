import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, Square, Plus, Trash2, Clock, Calendar, 
  Bell, AlertCircle, CheckCircle2, Star, Tag, ChevronDown, Filter, Sparkles,
  Edit2, ChevronRight, ChevronLeft, ArrowRight, CornerDownRight, RotateCcw,
  AlertTriangle, Phone, DollarSign, UserCheck, ShieldCheck, FileText, Send, X,
  CalendarDays, Bookmark, MoreVertical, Check, Volume2, AlarmClock, Lock
} from 'lucide-react';
import { getTodayDateString } from './dateUtils';
import { db } from './firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, serverTimestamp 
} from 'firebase/firestore';

// Follow-up quick action templates
const FOLLOW_UP_TEMPLATES = [
  { title: 'Call Dealer for dispatch confirmation', category: 'Follow-up', priority: 'High', dueTime: '11:00 AM' },
  { title: 'Follow up on payment clearance with Accounts', category: 'Follow-up', priority: 'Critical', dueTime: '11:45 AM' },
  { title: 'Check pending order approval with Manager', category: 'Follow-up', priority: 'Medium', dueTime: '01:30 PM' },
  { title: 'Contact customer for gate access / delivery coordinates', category: 'Follow-up', priority: 'Medium', dueTime: '03:00 PM' },
  { title: 'Follow up on vehicle departure with Transportation', category: 'Follow-up', priority: 'High', dueTime: '04:30 PM' },
  { title: 'Review pending QC inspection reports', category: 'Follow-up', priority: 'Medium', dueTime: '05:30 PM' }
];

export default function TodoReminderView({ 
  currentUser, 
  departments = [], 
  employees = [],
  onConvertToOfficialTask 
}) {
  const todayStr = getTodayDateString();
  const userId = currentUser?.id || currentUser?.employeeId || 'default_user';
  const userStorageKey = `stark_employee_planner_${userId}`;

  // State: To-Dos list
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Storage read failed', e);
    }
    // Default starter personal work items for Stark Steel Doors personnel
    return [
      {
        id: `todo_init_1`,
        userId,
        title: 'Call regional dealer for priority project specifications',
        description: 'Verify frame dimensions and lock orientation before order submission.',
        category: 'Follow-up',
        priority: 'High',
        dueDate: todayStr,
        dueTime: '10:30 AM',
        reminderDate: todayStr,
        reminderTime: '10:15 AM',
        recurrence: 'none',
        notes: 'Spoke with warehouse in-charge; frames are in ready stock.',
        completed: false,
        reminderActive: true,
        starred: true,
        createdAt: new Date().toISOString()
      },
      {
        id: `todo_init_2`,
        userId,
        title: 'Review morning invoice releases with Accounts desk',
        description: 'Ensure GST verification is sealed for today 12:00 PM dispatch batch.',
        category: 'Work',
        priority: 'Critical',
        dueDate: todayStr,
        dueTime: '11:45 AM',
        reminderDate: todayStr,
        reminderTime: '11:30 AM',
        recurrence: 'daily',
        notes: '',
        completed: false,
        reminderActive: true,
        starred: false,
        createdAt: new Date().toISOString()
      },
      {
        id: `todo_init_3`,
        userId,
        title: 'Weekly inventory balance checklist sync',
        description: 'Cross-examine high-gloss finish availability against incoming bookings.',
        category: 'Administration',
        priority: 'Medium',
        dueDate: todayStr,
        dueTime: '04:00 PM',
        reminderDate: todayStr,
        reminderTime: '03:45 PM',
        recurrence: 'weekly',
        notes: '',
        completed: false,
        reminderActive: false,
        starred: false,
        createdAt: new Date().toISOString()
      }
    ];
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
    if (!db || !userId) return;
    try {
      const todosQuery = query(
        collection(db, 'personal_todos'),
        where('userId', '==', userId)
      );
      const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
        if (!snapshot.empty) {
          const remoteList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTodos(prev => {
            // Merge with local if newer
            const mergedMap = new Map();
            prev.forEach(t => mergedMap.set(t.id, t));
            remoteList.forEach(t => mergedMap.set(t.id, t));
            return Array.from(mergedMap.values());
          });
        }
      }, (err) => {
        // Silently fallback to localStorage if firestore is offline or permission-scoped
        console.info('Personal To-Do offline storage active:', err.message);
      });
      return () => unsubscribe();
    } catch (e) {
      console.info('Firestore hook note:', e);
    }
  }, [userId]);

  // Active view tabs & filters
  const [activeTab, setActiveTab] = useState('my_day'); // 'my_day' | 'upcoming' | 'all' | 'starred' | 'completed' | 'calendar'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('all');
  const [calendarMode, setCalendarMode] = useState('monthly'); // 'daily' | 'weekly' | 'monthly'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr);

  // Quick Add State (Inline compact creation)
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

  // Daily Work Log modal
  const [showLogWorkModal, setShowLogWorkModal] = useState(false);
  const [logWorkTitle, setLogWorkTitle] = useState('');
  const [logWorkCategory, setLogWorkCategory] = useState('Work');
  const [logWorkHours, setLogWorkHours] = useState('1');
  const [logWorkNotes, setLogWorkNotes] = useState('');

  // Handle Log Work Done Today
  const handleLogWorkDone = (e) => {
    if (e) e.preventDefault();
    if (!logWorkTitle.trim()) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const completedWorkItem = {
      id: `work_log_${Date.now()}`,
      userId,
      title: logWorkTitle.trim(),
      description: logWorkNotes.trim() ? `Completed Today (${logWorkHours} hrs): ${logWorkNotes.trim()}` : `Completed Today (${logWorkHours} hrs)`,
      category: logWorkCategory,
      priority: 'Medium',
      dueDate: todayStr,
      dueTime: timeNow,
      completed: true, // Marked complete automatically as work done!
      completedAt: new Date().toISOString(),
      isWorkLog: true,
      timeSpent: `${logWorkHours}h`,
      reminderActive: false,
      starred: false,
      createdAt: new Date().toISOString()
    };

    setTodos(prev => [completedWorkItem, ...prev]);
    syncToFirestore(completedWorkItem, 'set');

    setLogWorkTitle('');
    setLogWorkNotes('');
    setLogWorkHours('1');
    setShowLogWorkModal(false);
  };

  // Notification Banner & Audio
  const [activeAlertReminder, setActiveAlertReminder] = useState(null);

  // Browser Notification Permission Handler
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('STARK STEEL DOORS - Personal Planner', {
          body: 'Planner reminder alerts enabled on this device.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Background Periodic Reminder Checker (runs every 30 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentDateStr = getTodayDateString();

      todos.forEach(todo => {
        if (!todo.completed && todo.reminderActive && todo.dueDate === currentDateStr && todo.dueTime) {
          // Parse HH:MM AM/PM
          const parts = todo.dueTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (parts) {
            let h = parseInt(parts[1], 10);
            const m = parseInt(parts[2], 10);
            const period = parts[3].toUpperCase();
            if (period === 'PM' && h < 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;

            // Check within 2-minute alert window and avoid duplicate triggering within same minute
            const diffMinutes = (h * 60 + m) - (currentHours * 60 + currentMinutes);
            if (diffMinutes === 0 && !todo.lastTriggeredAt) {
              setActiveAlertReminder(todo);
              // Trigger Browser Notification if supported
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Reminder: ${todo.title}`, {
                  body: `Scheduled for ${todo.dueTime} [${todo.priority} Priority]. Tap to review.`,
                  icon: '/favicon.ico'
                });
              }
              // Mark reminder as triggered to prevent spam
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
      // Offline fallback
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

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewNotes('');
    setShowQuickAddExpanded(false);
  };

  // Fast quick add with enter key
  const handleQuickAddKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTodo();
    }
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

  // Delete item
  const handleDeleteTodo = (id) => {
    const item = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));
    if (item) syncToFirestore(item, 'delete');
    if (editingTodo?.id === id) setEditingTodo(null);
  };

  // Toggle Complete
  const handleToggleComplete = (id) => {
    const item = todos.find(t => t.id === id);
    if (!item) return;

    const nextCompleted = !item.completed;
    
    // If recurring item is completed, create next recurrence automatically
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

    updateTodoItem(id, { completed: nextCompleted });
  };

  // Reschedule helper
  const handleReschedule = (id, daysToAdd) => {
    const item = todos.find(t => t.id === id);
    if (!item) return;
    const base = new Date(item.dueDate || todayStr);
    base.setDate(base.getDate() + daysToAdd);
    const newDateStr = base.toISOString().split('T')[0];
    updateTodoItem(id, { dueDate: newDateStr, reminderDate: newDateStr });
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
    updateTodoItem(id, { dueTime: snoozedTime, reminderTime: snoozedTime, lastTriggeredAt: null });
    setActiveAlertReminder(null);
  };

  // Convert Personal Item into Official Enterprise Task (subject to permissions)
  const handlePromoteToOfficial = (todo) => {
    if (onConvertToOfficialTask) {
      onConvertToOfficialTask({
        title: todo.title,
        description: `${todo.description || ''}\n\n[Converted from Personal Planner: ${todo.notes || 'No extra notes'}]`,
        priority: todo.priority?.toUpperCase() || 'MEDIUM',
        deadlineDate: todo.dueDate || todayStr
      });
    }
  };

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      // Category Filter
      if (selectedCategoryFilter !== 'all' && t.category !== selectedCategoryFilter) return false;
      // Priority Filter
      if (selectedPriorityFilter !== 'all' && t.priority !== selectedPriorityFilter) return false;

      // Tab Views
      if (activeTab === 'my_day') {
        return t.dueDate === todayStr;
      }
      if (activeTab === 'work_done') {
        return t.dueDate === todayStr && t.completed;
      }
      if (activeTab === 'upcoming') {
        return t.dueDate > todayStr && !t.completed;
      }
      if (activeTab === 'starred') {
        return t.starred && !t.completed;
      }
      if (activeTab === 'completed') {
        return t.completed;
      }
      if (activeTab === 'all') {
        return true;
      }
      return true;
    }).sort((a, b) => {
      // Order: Uncompleted first, then by priority (Critical > High > Medium > Low), then due time
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prioOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const diffPrio = (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0);
      if (diffPrio !== 0) return diffPrio;
      return (a.dueTime || '').localeCompare(b.dueTime || '');
    });
  }, [todos, activeTab, selectedCategoryFilter, selectedPriorityFilter, todayStr]);

  // Four Productivity Summary KPIs (Database values)
  const stats = useMemo(() => {
    const todayList = todos.filter(t => t.dueDate === todayStr);
    const todayTasks = todayList.length;
    const completedToday = todayList.filter(t => t.completed).length;
    const pendingToday = todayList.filter(t => !t.completed).length;
    const overdue = todos.filter(t => t.dueDate < todayStr && !t.completed).length;
    const totalCompleted = todos.filter(t => t.completed).length;
    
    const completionPercent = todayTasks > 0 ? Math.round((completedToday / todayTasks) * 100) : 0;
    const remainingToday = todayTasks - completedToday;

    return {
      todayTasks,
      completedToday,
      pendingToday,
      overdue,
      totalCompleted,
      completionPercent,
      remainingToday
    };
  }, [todos, todayStr]);

  // Calendar dates generation
  const calendarDays = useMemo(() => {
    const baseDate = new Date(selectedCalendarDate || todayStr);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Leading days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: null, isCurrentMonth: false });
    }
    // Month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const itemsForDay = todos.filter(t => t.dueDate === dStr);
      days.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        itemsCount: itemsForDay.length,
        hasPending: itemsForDay.some(t => !t.completed),
        hasCritical: itemsForDay.some(t => t.priority === 'Critical' && !t.completed)
      });
    }
    return days;
  }, [selectedCalendarDate, todos, todayStr]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans select-none">
      
      {/* ACTIVE REMINDER POPUP BANNER (IF TRIGGERED) */}
      {activeAlertReminder && (
        <div className="bg-[#05331F] text-white p-4 rounded-2xl shadow-xl border border-emerald-500/40 flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0 animate-bounce">
              <AlarmClock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>SCHEDULED REMINDER ALERT</span>
                <span className="text-white/60">• {activeAlertReminder.dueTime}</span>
              </div>
              <div className="text-sm font-bold text-white truncate">{activeAlertReminder.title}</div>
              <div className="text-xs text-emerald-200/80 truncate">
                {activeAlertReminder.category} • Priority: {activeAlertReminder.priority}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSnooze(activeAlertReminder.id, 15)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition"
            >
              Snooze 15m
            </button>
            <button
              onClick={() => {
                handleToggleComplete(activeAlertReminder.id);
                setActiveAlertReminder(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-[#05331F] hover:bg-emerald-300 text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
            <button
              onClick={() => setActiveAlertReminder(null)}
              className="p-1.5 text-white/60 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION A: PAGE HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">My Workspace</h1>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
              Personal Planner
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your daily activities, reminders and follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Current Date Display */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-[#05331F]" />
            <span className="font-mono">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {/* Browser Notification Permission Button */}
          <button
            onClick={requestNotificationPermission}
            title="Enable audio & desktop notifications"
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
          >
            <Bell className="w-4 h-4 text-emerald-800" />
          </button>

          {/* Calendar View Toggle Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'calendar' ? 'my_day' : 'calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              activeTab === 'calendar'
                ? 'bg-[#05331F] text-white border-[#05331F]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Calendar View</span>
          </button>

          {/* Log Work Done Today (Quick Work Entry) */}
          <button
            onClick={() => setShowLogWorkModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#05331F] border border-emerald-300 text-xs font-bold transition shadow-2xs active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Log Work Done Today</span>
          </button>

          {/* Add New Item Button */}
          <button
            onClick={() => setShowQuickAddExpanded(!showQuickAddExpanded)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472b] text-white text-xs font-bold transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* SECTION B: PRODUCTIVITY SUMMARY (4 Compact Statistics Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Today's Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Today's Tasks</div>
            <div className="text-2xl font-black font-mono text-[#0F172A] mt-1">{stats.todayTasks}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Scheduled for today</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#05331F] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 text-emerald-800" />
          </div>
        </div>

        {/* 2. Completed */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-black font-mono text-emerald-800 mt-1">{stats.completedToday}</div>
            <div className="text-[11px] text-emerald-600/80 mt-0.5">{stats.completionPercent}% finished today</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        {/* 3. Pending */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Pending</div>
            <div className="text-2xl font-black font-mono text-blue-700 mt-1">{stats.pendingToday}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting completion</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-100">
            <RotateCcw className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* 4. Overdue */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Overdue</div>
            <div className="text-2xl font-black font-mono text-rose-700 mt-1">{stats.overdue}</div>
            <div className="text-[11px] text-rose-600/80 mt-0.5">Action required</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold border border-rose-100">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* SECTION C: DAILY PROGRESS */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F172A]">Daily Progress:</span>
            <span className="text-slate-500">
              {stats.completedToday} of {stats.todayTasks} tasks completed ({stats.remainingToday} remaining)
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-[#05331F] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {stats.completionPercent}% Achieved
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="bg-[#05331F] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, stats.completionPercent)}%` }}
          />
        </div>
      </div>

      {/* SECTION E: QUICK ADD TASK (COMPACT INTERFACE) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            placeholder="Quick Add: Type a personal task or reminder and press Enter..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F] transition"
          />
          <button
            onClick={() => setShowQuickAddExpanded(!showQuickAddExpanded)}
            title="Expand task options"
            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              showQuickAddExpanded 
                ? 'bg-[#05331F] text-white border-[#05331F]' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Options</span>
          </button>
          <button
            onClick={handleCreateTodo}
            disabled={!newTitle.trim()}
            className="px-4 py-2.5 bg-[#05331F] disabled:bg-slate-200 hover:bg-[#07472b] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Add</span>
          </button>
        </div>

        {/* Expanded Options */}
        {showQuickAddExpanded && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              >
                <option value="Work">Work</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Meeting">Meeting</option>
                <option value="Personal">Personal</option>
                <option value="Administration">Administration</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Time</label>
              <input
                type="text"
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional brief description or agenda..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recurrence</label>
              <select
                value={newRecurrence}
                onChange={(e) => setNewRecurrence(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden focus:border-[#05331F]"
              >
                <option value="none">No Recurrence</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="enableReminderCheck"
                checked={enableReminder}
                onChange={(e) => setEnableReminder(e.target.checked)}
                className="w-4 h-4 accent-[#05331F] rounded"
              />
              <label htmlFor="enableReminderCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Set Reminder Alert
              </label>
            </div>
          </div>
        )}
      </div>

      {/* SECTION G: DEDICATED FOLLOW-UP SECTION */}
      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-800" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Quick Operational Follow-ups</h3>
            <span className="text-[10px] text-slate-400">• Click template to schedule</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {FOLLOW_UP_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => {
                const item = {
                  id: `todo_${Date.now()}_${idx}`,
                  userId,
                  title: tmpl.title,
                  description: 'Operational follow-up checklist',
                  category: tmpl.category,
                  priority: tmpl.priority,
                  dueDate: todayStr,
                  dueTime: tmpl.dueTime,
                  reminderDate: todayStr,
                  reminderTime: tmpl.dueTime,
                  recurrence: 'none',
                  notes: '',
                  completed: false,
                  reminderActive: true,
                  starred: false,
                  createdAt: new Date().toISOString()
                };
                setTodos(prev => [item, ...prev]);
                syncToFirestore(item, 'set');
              }}
              className="text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-xs text-slate-800 transition flex items-center justify-between group shadow-2xs"
            >
              <div className="truncate mr-2">
                <div className="font-semibold truncate text-[11px] text-[#0F172A]">{tmpl.title}</div>
                <div className="text-[10px] text-slate-400 font-mono">{tmpl.dueTime} • {tmpl.priority}</div>
              </div>
              <Plus className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* SECTION F: TASK VIEWS (TABS & FILTERS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'my_day', label: 'My Day' },
            { id: 'work_done', label: 'Work Done Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'all', label: 'All Items' },
            { id: 'starred', label: 'Starred' },
            { id: 'completed', label: 'Completed' },
            { id: 'calendar', label: 'Calendar' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#05331F] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.id === 'my_day' && stats.todayTasks > 0 && (
                <span className="ml-1.5 text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                  {stats.todayTasks}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Secondary Category & Priority Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="Work">Work</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Meeting">Meeting</option>
            <option value="Personal">Personal</option>
            <option value="Administration">Administration</option>
          </select>

          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* SECTION H: CALENDAR VIEW */}
      {activeTab === 'calendar' ? (
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-800" />
              <h2 className="text-base font-bold text-[#0F172A]">
                {new Date(selectedCalendarDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const d = new Date(selectedCalendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setSelectedCalendarDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedCalendarDate(todayStr)}
                className="px-2.5 py-1 text-xs font-bold text-[#05331F] hover:bg-emerald-50 rounded-lg border border-slate-200"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date(selectedCalendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setSelectedCalendarDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 py-1 border-b border-slate-100 font-mono">
            <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.day) {
                return <div key={idx} className="h-20 bg-slate-50/40 rounded-xl" />;
              }
              const isSelected = cell.dateStr === selectedCalendarDate;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCalendarDate(cell.dateStr);
                    setNewDueDate(cell.dateStr);
                  }}
                  className={`h-22 p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#05331F] bg-emerald-50/50 ring-1 ring-[#05331F]'
                      : cell.isToday
                      ? 'border-emerald-400 bg-white shadow-xs'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${cell.isToday ? 'text-[#05331F] underline' : 'text-slate-800'}`}>
                      {cell.day}
                    </span>
                    {cell.itemsCount > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                        cell.hasCritical ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cell.itemsCount}
                      </span>
                    )}
                  </div>
                  {/* Item indicator */}
                  <div className="text-[10px] text-slate-500 truncate">
                    {cell.itemsCount > 0 ? (
                      <span className="text-[10px] text-emerald-800 font-medium truncate block">
                        {cell.itemsCount} scheduled
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-300 opacity-0 hover:opacity-100">+ Add</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Items preview */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              Items for {selectedCalendarDate}:
            </h4>
            <div className="space-y-1.5">
              {todos.filter(t => t.dueDate === selectedCalendarDate).length === 0 ? (
                <div className="text-xs text-slate-400 italic">No tasks scheduled for this day. Click 'Add New Item' to create one.</div>
              ) : (
                todos.filter(t => t.dueDate === selectedCalendarDate).map(t => (
                  <div key={t.id} className="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                    <span className={t.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}>
                      {t.title} ({t.dueTime || 'No time'})
                    </span>
                    <button
                      onClick={() => handleToggleComplete(t.id)}
                      className="text-xs text-emerald-700 font-bold"
                    >
                      {t.completed ? 'Reopen' : 'Mark Done'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (

        /* SECTION D: TODAY'S SCHEDULE (MAIN TIMELINE) */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                {activeTab === 'my_day' ? "Today's Schedule & Timeline" : `${activeTab.replace('_', ' ').toUpperCase()} Items`}
              </h2>
              <p className="text-xs text-[#64748B]">
                Personal chronological activity flow and scheduled reminders
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {filteredTodos.length} {filteredTodos.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* List or Empty State */}
          {filteredTodos.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">All clear! No tasks in this view</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enjoy your clear schedule or use the Quick Add bar above to add a reminder or follow-up note.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTodos.map((todo) => {
                const isOverdue = todo.dueDate < todayStr && !todo.completed;
                const isBeingEdited = editingTodo?.id === todo.id;
                // Strict Past-Day Lock Rule: Today's tasks cannot be edited tomorrow (past dates are locked)
                const isLockedPastDate = todo.dueDate && todo.dueDate < todayStr;

                return (
                  <div 
                    key={todo.id} 
                    className={`py-3.5 px-3 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      todo.completed 
                        ? 'bg-slate-50/50 opacity-70' 
                        : isOverdue 
                        ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Left: Checkbox + Timeline Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(todo.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                          todo.completed 
                            ? 'bg-[#05331F] border-[#05331F] text-white' 
                            : 'border-slate-300 hover:border-[#05331F] bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {isBeingEdited ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingTodo.title}
                              onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-1.5 focus:outline-hidden"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTodo.dueTime || ''}
                                onChange={(e) => setEditingTodo({ ...editingTodo, dueTime: e.target.value })}
                                placeholder="Due time (e.g. 11:00 AM)"
                                className="text-xs border border-slate-300 rounded-lg p-1"
                              />
                              <button
                                onClick={() => {
                                  updateTodoItem(todo.id, editingTodo);
                                  setEditingTodo(null);
                                }}
                                className="px-2.5 py-1 bg-[#05331F] text-white font-bold text-xs rounded-lg"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTodo(null)}
                                className="px-2.5 py-1 text-slate-500 text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold ${todo.completed ? 'line-through text-slate-400' : 'text-[#0F172A]'}`}>
                                {todo.title}
                              </span>

                              {/* Category Badge */}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {todo.category}
                              </span>

                              {/* Priority Badge */}
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                todo.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                                todo.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {todo.priority}
                              </span>

                              {/* Recurrence Badge */}
                              {todo.recurrence && todo.recurrence !== 'none' && (
                                <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  ↻ {todo.recurrence}
                                </span>
                              )}
                            </div>

                            {/* Description or Notes if present */}
                            {todo.description && (
                              <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">{todo.description}</p>
                            )}

                            {/* Meta & Due Schedule */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap font-mono">
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {todo.dueDate} {todo.dueTime && `• ${todo.dueTime}`}
                              </span>

                              {isOverdue && (
                                <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">
                                  OVERDUE
                                </span>
                              )}

                              {todo.reminderActive && (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  Alert Set
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-8 sm:ml-0">
                      {/* Promote to Official Company Task Button */}
                      <button
                        onClick={() => handlePromoteToOfficial(todo)}
                        title="Promote to Official Company Task"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>

                      {/* Reschedule +1 Day */}
                      {!isLockedPastDate && (
                        <button
                          onClick={() => handleReschedule(todo.id, 1)}
                          title="Reschedule +1 Day"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit (Locked if past date) */}
                      {!isLockedPastDate ? (
                        <button
                          onClick={() => setEditingTodo(todo)}
                          title="Edit Item"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span title="Locked: Past day tasks cannot be modified" className="p-1.5 text-slate-300">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {/* Star */}
                      <button
                        onClick={() => updateTodoItem(todo.id, { starred: !todo.starred })}
                        title={todo.starred ? 'Starred' : 'Star this item'}
                        className={`p-1.5 rounded-lg transition ${
                          todo.starred ? 'text-amber-500 fill-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${todo.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Delete (Disallowed on locked past tasks) */}
                      {!isLockedPastDate && (
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          title="Delete personal item"
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: LOG WORK DONE TODAY */}
      {showLogWorkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Log Work Done Today</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{todayStr} • Daily Activity Log</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogWorkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogWorkDone} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">What did you accomplish today? *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conducted stock audit for Batch #402, cleared 15 invoices"
                  value={logWorkTitle}
                  onChange={(e) => setLogWorkTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={logWorkCategory}
                    onChange={(e) => setLogWorkCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white"
                  >
                    <option value="Work">Operational Work</option>
                    <option value="Follow-up">Dealer Follow-up</option>
                    <option value="Meeting">Internal Meeting</option>
                    <option value="Administration">Administration / QC</option>
                    <option value="Other">Other Activity</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time Spent (Hours)</label>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={logWorkHours}
                    onChange={(e) => setLogWorkHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Remarks / Key Takeaways</label>
                <textarea
                  rows="3"
                  placeholder="Additional details, outputs, completed items or challenges encountered..."
                  value={logWorkNotes}
                  onChange={(e) => setLogWorkNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogWorkModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472b] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Save to Today's Work Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
