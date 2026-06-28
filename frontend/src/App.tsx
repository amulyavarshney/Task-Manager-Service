import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Task, TaskStatus, TaskPriority, ExecutorStats, Toast, SortField, SortDir } from './types';
import { useDarkMode } from './hooks/useDarkMode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTemplates } from './hooks/useTemplates';
import { api } from './api';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { StatsBar } from './components/StatsBar';
import { ToastContainer } from './components/ToastContainer';
import { ExecutorPanel } from './components/ExecutorPanel';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { Pagination } from './components/Pagination';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';

const POLL_INTERVAL_MS = 2000;

type FilterStatus = 'ALL' | TaskStatus;

const filterOptions: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Ready', value: 'READY' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' },
  { label: 'Failed', value: 'FAILED' },
];

const SORT_OPTIONS: { label: string; field: SortField; dir: SortDir }[] = [
  { label: 'Newest first',  field: 'createdAt',   dir: 'desc' },
  { label: 'Oldest first',  field: 'createdAt',   dir: 'asc'  },
  { label: 'Name A→Z',      field: 'taskName',    dir: 'asc'  },
  { label: 'Name Z→A',      field: 'taskName',    dir: 'desc' },
  { label: 'Duration ↑',    field: 'taskDuration',dir: 'asc'  },
  { label: 'Duration ↓',    field: 'taskDuration',dir: 'desc' },
  { label: 'Priority ↑',    field: 'priority',    dir: 'asc'  },
  { label: 'Priority ↓',    field: 'priority',    dir: 'desc' },
  { label: 'Status',        field: 'taskStatus',  dir: 'asc'  },
];

let toastSeq = 0;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [executorStats, setExecutorStats] = useState<ExecutorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showExecutor, setShowExecutor] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [sortIndex, setSortIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [dark, setDark] = useDarkMode();
  const { templates, addTemplate, removeTemplate } = useTemplates();
  const [showHelp, setShowHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function toast(type: Toast['type'], message: string) {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
  }

  const fetchTasks = useCallback(async (opts?: { page?: number; size?: number; sortIdx?: number }) => {
    const currentSort = SORT_OPTIONS[opts?.sortIdx ?? sortIndex];
    try {
      const data = await api.listTasks({
        page: opts?.page ?? page,
        size: opts?.size ?? pageSize,
        sort: `${currentSort.field},${currentSort.dir}`,
      });
      setTasks(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setError('');
      setDetailTask((prev) => prev ? data.content.find((t) => t.taskId === prev.taskId) ?? null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortIndex]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getExecutorStats();
      setExecutorStats(data);
    } catch {
      // stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const shortcuts = useMemo(() => ({
    onNew: () => { if (!showCreate && !detailTask && !showHelp) setShowCreate(true); },
    onFocusSearch: () => searchRef.current?.focus(),
    onRefresh: () => { fetchTasks(); fetchStats(); },
    onEscape: () => {
      if (showHelp) { setShowHelp(false); return; }
      if (showCreate) { setShowCreate(false); return; }
      if (detailTask) { setDetailTask(null); return; }
      if (selected.size > 0) setSelected(new Set());
    },
    onToggleDark: () => setDark((d) => !d),
    onHelp: () => setShowHelp((v) => !v),
  }), [showCreate, detailTask, showHelp, selected, fetchTasks, fetchStats, setDark]);

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchStats]);

  useEffect(() => {
    const hasRunning = tasks.some((t) => t.taskStatus === 'IN_PROGRESS');
    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(() => { fetchTasks(); fetchStats(); }, POLL_INTERVAL_MS);
    } else if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [tasks, fetchTasks, fetchStats]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchTasks({ page: newPage });
  }

  function handlePageSizeChange(newSize: number) {
    setPage(0);
    setPageSize(newSize);
    fetchTasks({ page: 0, size: newSize });
  }

  function handleSortChange(idx: number) {
    setSortIndex(idx);
    setPage(0);
    fetchTasks({ page: 0, sortIdx: idx });
  }

  async function handleCreate(name: string, duration: number, priority: TaskPriority, tags: string[], maxRetries: number) {
    await api.createTask({ taskName: name, taskDuration: duration, priority, tags, maxRetries });
    setPage(0);
    await fetchTasks({ page: 0 });
    toast('success', `Task "${name}" created`);
  }

  async function handleUpdate(id: number, name: string, duration: number, priority: TaskPriority, tags: string[], maxRetries: number) {
    const updated = await api.updateTask(id, { taskName: name, taskDuration: duration, priority, tags, maxRetries });
    setTasks((prev) => prev.map((t) => (t.taskId === id ? updated : t)));
    toast('success', `Task "${name}" updated`);
  }

  async function handleDelete(id: number) {
    const name = tasks.find((t) => t.taskId === id)?.taskName ?? `#${id}`;
    await api.deleteTask(id);
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    if (detailTask?.taskId === id) setDetailTask(null);
    await fetchTasks();
    toast('info', `Task "${name}" deleted`);
  }

  async function handleStart(id: number) {
    const updated = await api.startTask(id);
    setTasks((prev) => prev.map((t) => (t.taskId === id ? updated : t)));
    setDetailTask((prev) => prev?.taskId === id ? updated : prev);
    toast('info', `Task "${updated.taskName}" started`);
    fetchStats();
  }

  async function handleBulkStart() {
    const ready = tasks.filter((t) => selected.has(t.taskId) && t.taskStatus === 'READY');
    let ok = 0;
    for (const t of ready) {
      try { await handleStart(t.taskId); ok++; } catch { /* individual errors shown on card */ }
    }
    if (ok > 0) toast('success', `Started ${ok} task${ok > 1 ? 's' : ''}`);
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} selected task(s)?`)) return;
    let ok = 0;
    for (const id of selected) {
      try { await api.deleteTask(id); ok++; } catch { /* skip */ }
    }
    setSelected(new Set());
    await fetchTasks({ page: 0 });
    setPage(0);
    toast('info', `Deleted ${ok} task${ok > 1 ? 's' : ''}`);
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const filtered = tasks.filter((t) => {
    const matchesStatus = filter === 'ALL' || t.taskStatus === filter;
    const matchesSearch = t.taskName.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Task Manager</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp((v) => !v)}
              title="Keyboard shortcuts (?)"
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium leading-none"
            >
              ?
            </button>

            <button
              onClick={() => setDark((d) => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => { setShowExecutor((v) => !v); fetchStats(); }}
              title="Thread pool"
              className={`p-2 border rounded-lg text-sm transition-colors ${
                showExecutor
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-slate-800 dark:text-slate-100">
        {/* Executor panel */}
        {showExecutor && (
          <div className="mb-6">
            <ExecutorPanel stats={executorStats} loading={statsLoading} />
          </div>
        )}

        {/* Stats */}
        {!loading && tasks.length > 0 && (
          <div className="mb-6">
            <StatsBar
              tasks={tasks}
              totalElements={totalElements}
              selected={selected}
              onBulkStart={handleBulkStart}
              onBulkDelete={handleBulkDelete}
            />
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === opt.value ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={sortIndex}
            onChange={(e) => handleSortChange(Number(e.target.value))}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Sort"
          >
            {SORT_OPTIONS.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => { fetchTasks(); fetchStats(); }}
            title="Refresh"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4 mb-4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/3 mb-5" />
                <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            {tasks.length === 0 ? (
              <>
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">No tasks yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">Create your first task to get started</p>
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Create Task
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">No matching tasks</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm">Try a different search or filter</p>
              </>
            )}
          </div>
        )}

        {/* Task grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="task-grid">
            {filtered.map((task) => (
              <div key={task.taskId} className="relative">
                {/* Checkbox */}
                <div
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(task.taskId); }}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    selected.has(task.taskId)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400'
                  }`}>
                    {selected.has(task.taskId) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className={selected.has(task.taskId) ? 'ring-2 ring-blue-400 rounded-xl' : ''}>
                  <TaskCard
                    task={task}
                    onStart={handleStart}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onViewDetail={setDetailTask}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </main>

      {/* Modals & drawers */}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

      {showCreate && (
        <TaskFormModal
          onSave={(name, duration, priority, tags, maxRetries) => handleCreate(name, duration, priority, tags, maxRetries)}
          onClose={() => setShowCreate(false)}
          templates={templates}
          onSaveTemplate={addTemplate}
          onDeleteTemplate={removeTemplate}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onStart={handleStart}
          onDelete={handleDelete}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
