import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskStatus, TaskPriority, ExecutorStats, Toast } from './types';
import { api } from './api';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { StatsBar } from './components/StatsBar';
import { ToastContainer } from './components/ToastContainer';
import { ExecutorPanel } from './components/ExecutorPanel';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';

const POLL_INTERVAL_MS = 2000;

type FilterStatus = 'ALL' | TaskStatus;

const filterOptions: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Ready', value: 'READY' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' },
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function toast(type: Toast['type'], message: string) {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
  }

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data);
      setError('');
      // Keep detail drawer in sync
      setDetailTask((prev) => prev ? data.find((t) => t.taskId === prev.taskId) ?? null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  }, []);

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

  useEffect(() => {
    Promise.all([fetchTasks(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchStats]);

  useEffect(() => {
    const hasRunning = tasks.some((t) => t.taskStatus === 'IN_PROGRESS');
    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        fetchTasks();
        fetchStats();
      }, POLL_INTERVAL_MS);
    } else if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [tasks, fetchTasks, fetchStats]);

  async function handleCreate(name: string, duration: number, priority: TaskPriority, tags: string[]) {
    const created = await api.createTask({ taskName: name, taskDuration: duration, priority, tags });
    setTasks((prev) => [created, ...prev]);
    toast('success', `Task "${name}" created`);
  }

  async function handleUpdate(id: number, name: string, duration: number, priority: TaskPriority, tags: string[]) {
    const updated = await api.updateTask(id, { taskName: name, taskDuration: duration, priority, tags });
    setTasks((prev) => prev.map((t) => (t.taskId === id ? updated : t)));
    toast('success', `Task "${name}" updated`);
  }

  async function handleDelete(id: number) {
    const name = tasks.find((t) => t.taskId === id)?.taskName ?? `#${id}`;
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.taskId !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    if (detailTask?.taskId === id) setDetailTask(null);
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
    await fetchTasks();
    setSelected(new Set());
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Task Manager</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowExecutor((v) => !v); fetchStats(); }}
              title="Thread pool"
              className={`p-2 border rounded-lg text-sm transition-colors ${
                showExecutor
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === opt.value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { fetchTasks(); fetchStats(); }}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
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
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/4 mb-4" />
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-5" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            {tasks.length === 0 ? (
              <>
                <p className="text-slate-600 font-medium mb-1">No tasks yet</p>
                <p className="text-slate-400 text-sm mb-5">Create your first task to get started</p>
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Create Task
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 font-medium mb-1">No matching tasks</p>
                <p className="text-slate-400 text-sm">Try a different search or filter</p>
              </>
            )}
          </div>
        )}

        {/* Task grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      : 'border-slate-300 bg-white hover:border-blue-400'
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
      </main>

      {/* Modals & drawers */}
      {showCreate && (
        <TaskFormModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
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
