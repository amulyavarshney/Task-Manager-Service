import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  ExecutorStats,
  PagedTaskResponse,
  TaskStats,
  TaskStatus,
  TaskPriority,
  BulkActionResponse,
  SortField,
} from './types';
import type { TaskListParams } from './api';

const STORE_KEY = 'taskmanager.demo.tasks';
const SEQ_KEY = 'taskmanager.demo.seq';
const EXEC_KEY = 'taskmanager.demo.executor';

type DemoExecutor = {
  corePoolSize: number;
  maxPoolSize: number;
  activeCount: number;
  poolSize: number;
  queueSize: number;
  queueCapacity: number;
  completedTaskCount: number;
};

const timers = new Map<number, ReturnType<typeof setTimeout>>();
const cancelFlags = new Set<number>();

function nowIso() {
  return new Date().toISOString();
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

function nextId(): number {
  const n = Number(localStorage.getItem(SEQ_KEY) ?? '0') + 1;
  localStorage.setItem(SEQ_KEY, String(n));
  return n;
}

function loadExecutor(): DemoExecutor {
  try {
    const raw = localStorage.getItem(EXEC_KEY);
    if (raw) return JSON.parse(raw) as DemoExecutor;
  } catch { /* ignore */ }
  return {
    corePoolSize: 2,
    maxPoolSize: 4,
    activeCount: 0,
    poolSize: 2,
    queueSize: 0,
    queueCapacity: 10,
    completedTaskCount: 0,
  };
}

function saveExecutor(exec: DemoExecutor) {
  localStorage.setItem(EXEC_KEY, JSON.stringify(exec));
}

function bumpActive(delta: number) {
  const exec = loadExecutor();
  exec.activeCount = Math.max(0, exec.activeCount + delta);
  exec.poolSize = Math.min(exec.maxPoolSize, Math.max(exec.corePoolSize, exec.activeCount));
  saveExecutor(exec);
}

function seedIfEmpty() {
  if (loadTasks().length > 0) return;
  const samples: CreateTaskRequest[] = [
    { taskName: 'Welcome — try Run', taskDuration: 3, priority: 'HIGH', tags: ['demo'], maxRetries: 1 },
    { taskName: 'Build release notes', taskDuration: 5, priority: 'MEDIUM', tags: ['docs', 'ops'], maxRetries: 0 },
    { taskName: 'Nightly backup', taskDuration: 8, priority: 'LOW', tags: ['scheduled'], maxRetries: 2,
      scheduledAt: new Date(Date.now() + 120_000).toISOString() },
  ];
  const tasks = samples.map((s) => createFromRequest(s));
  saveTasks(tasks);
}

function createFromRequest(body: CreateTaskRequest): Task {
  return {
    taskId: nextId(),
    taskName: body.taskName,
    taskDuration: body.taskDuration,
    taskStatus: 'READY',
    priority: body.priority ?? 'MEDIUM',
    tags: body.tags ?? [],
    createdAt: nowIso(),
    startedAt: null,
    completedAt: null,
    resultMessage: null,
    maxRetries: body.maxRetries ?? 0,
    retryCount: 0,
    scheduledAt: body.scheduledAt ?? null,
    deletedAt: null,
  };
}

function updateTask(id: number, patch: Partial<Task>): Task {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.taskId === id);
  if (idx < 0) throw new Error(`Task not found with id: ${id}`);
  tasks[idx] = { ...tasks[idx], ...patch };
  saveTasks(tasks);
  return tasks[idx];
}

function getActive(id: number): Task {
  const t = loadTasks().find((x) => x.taskId === id && !x.deletedAt);
  if (!t) throw new Error(`Task not found with id: ${id}`);
  return t;
}

function priorityRank(p: TaskPriority) {
  return p === 'HIGH' ? 0 : p === 'MEDIUM' ? 1 : 2;
}

function matchesFilters(t: Task, params?: TaskListParams) {
  if (params?.status && params.status !== 'ALL' && t.taskStatus !== params.status) return false;
  if (params?.priority && t.priority !== params.priority) return false;
  if (params?.tag && !(t.tags ?? []).some((x) => x.toLowerCase() === params.tag!.toLowerCase())) return false;
  if (params?.search) {
    const q = params.search.toLowerCase();
    const inName = t.taskName.toLowerCase().includes(q);
    const inTags = (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
    if (!inName && !inTags) return false;
  }
  return true;
}

function sortTasks(tasks: Task[], sort?: string) {
  if (!sort) return tasks;
  const [field, dir] = sort.split(',') as [SortField | string, string];
  const mul = dir === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[field];
    const bv = (b as unknown as Record<string, unknown>)[field];
    if (field === 'priority') {
      return (priorityRank(a.priority) - priorityRank(b.priority)) * mul;
    }
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * mul;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
    return String(av ?? '').localeCompare(String(bv ?? '')) * mul;
  });
}

function paginate(tasks: Task[], params?: TaskListParams): PagedTaskResponse {
  const page = params?.page ?? 0;
  const size = params?.size ?? 12;
  const sorted = sortTasks(tasks, params?.sort);
  const start = page * size;
  const content = sorted.slice(start, start + size);
  const totalElements = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size) || 1);
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1 || totalElements === 0,
  };
}

function scheduleCompletion(taskId: number, durationSeconds: number, priority: TaskPriority) {
  cancelFlags.delete(taskId);
  bumpActive(1);
  const handle = setTimeout(() => {
    timers.delete(taskId);
    bumpActive(-1);
    if (cancelFlags.has(taskId)) {
      cancelFlags.delete(taskId);
      try {
        updateTask(taskId, {
          taskStatus: 'FAILED',
          completedAt: nowIso(),
          resultMessage: 'Cancelled by user',
        });
      } catch { /* purged */ }
      const exec = loadExecutor();
      exec.completedTaskCount += 1;
      saveExecutor(exec);
      return;
    }
    try {
      const t = getActive(taskId);
      updateTask(taskId, {
        taskStatus: 'DONE',
        completedAt: nowIso(),
        resultMessage: `Completed successfully in ${t.taskDuration}.0s`,
      });
      const exec = loadExecutor();
      exec.completedTaskCount += 1;
      saveExecutor(exec);
    } catch { /* deleted mid-run */ }
  }, Math.max(1, durationSeconds) * 1000);
  timers.set(taskId, handle);
  void priority; // reserved for future priority queue simulation
}

function startDueScheduled() {
  const now = Date.now();
  for (const t of loadTasks()) {
    if (t.deletedAt || t.taskStatus !== 'READY' || !t.scheduledAt) continue;
    if (new Date(t.scheduledAt).getTime() <= now) {
      try {
        demoApi.startTask(t.taskId);
      } catch { /* ignore */ }
    }
  }
}

let schedulerStarted = false;
function ensureScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(startDueScheduled, 5000);
}

export const demoApi = {
  listTasks: async (params?: TaskListParams) => {
    seedIfEmpty();
    ensureScheduler();
    const active = loadTasks().filter((t) => !t.deletedAt).filter((t) => matchesFilters(t, params));
    return paginate(active, params);
  },

  getHistory: async (params?: TaskListParams) => {
    seedIfEmpty();
    const deleted = loadTasks().filter((t) => !!t.deletedAt).filter((t) => matchesFilters(t, params));
    return paginate(deleted, { ...params, sort: params?.sort ?? 'deletedAt,desc' });
  },

  getTask: async (id: number) => getActive(id),

  getTaskStats: async (): Promise<TaskStats> => {
    seedIfEmpty();
    const active = loadTasks().filter((t) => !t.deletedAt);
    const byStatus: Record<TaskStatus, number> = { READY: 0, IN_PROGRESS: 0, DONE: 0, FAILED: 0 };
    for (const t of active) byStatus[t.taskStatus] += 1;
    return { total: active.length, byStatus };
  },

  createTask: async (body: CreateTaskRequest) => {
    seedIfEmpty();
    const task = createFromRequest(body);
    const tasks = loadTasks();
    tasks.unshift(task);
    saveTasks(tasks);
    return task;
  },

  updateTask: async (id: number, body: UpdateTaskRequest) => {
    const existing = getActive(id);
    if (existing.taskStatus !== 'READY') {
      throw new Error(`Task ${id} is not in READY status and cannot be updated.`);
    }
    return updateTask(id, {
      taskName: body.taskName ?? existing.taskName,
      taskDuration: body.taskDuration ?? existing.taskDuration,
      priority: body.priority ?? existing.priority,
      tags: body.tags ?? existing.tags,
      maxRetries: body.maxRetries ?? existing.maxRetries,
      scheduledAt: body.scheduledAt !== undefined ? body.scheduledAt : existing.scheduledAt,
    });
  },

  deleteTask: async (id: number) => {
    getActive(id);
    updateTask(id, { deletedAt: nowIso() });
  },

  purgeTask: async (id: number) => {
    const tasks = loadTasks();
    const next = tasks.filter((t) => t.taskId !== id);
    if (next.length === tasks.length) throw new Error(`Task not found with id: ${id}`);
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    saveTasks(next);
  },

  startTask: async (id: number) => {
    const task = getActive(id);
    if (task.taskStatus !== 'READY') {
      throw new Error(`Task ${id} is not in READY status and cannot be started.`);
    }
    const exec = loadExecutor();
    if (exec.activeCount >= exec.maxPoolSize && exec.queueSize >= exec.queueCapacity) {
      throw new Error('Thread pool is at capacity. Please retry later.');
    }
    const updated = updateTask(id, {
      taskStatus: 'IN_PROGRESS',
      startedAt: nowIso(),
      completedAt: null,
      resultMessage: null,
    });
    scheduleCompletion(id, updated.taskDuration, updated.priority);
    return updated;
  },

  cancelTask: async (id: number) => {
    const task = getActive(id);
    if (task.taskStatus !== 'IN_PROGRESS') {
      throw new Error(`Task ${id} must be IN_PROGRESS to cancel (current: ${task.taskStatus})`);
    }
    cancelFlags.add(id);
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
      bumpActive(-1);
      const updated = updateTask(id, {
        taskStatus: 'FAILED',
        completedAt: nowIso(),
        resultMessage: 'Cancelled by user',
      });
      const exec = loadExecutor();
      exec.completedTaskCount += 1;
      saveExecutor(exec);
      return updated;
    }
    return task;
  },

  resetTask: async (id: number) => {
    const task = getActive(id);
    if (task.taskStatus !== 'FAILED' && task.taskStatus !== 'DONE') {
      throw new Error(`Task ${id} must be FAILED or DONE to reset (current: ${task.taskStatus})`);
    }
    return updateTask(id, {
      taskStatus: 'READY',
      startedAt: null,
      completedAt: null,
      resultMessage: null,
      retryCount: 0,
    });
  },

  bulkStart: async (ids: number[]): Promise<BulkActionResponse> => {
    const response: BulkActionResponse = { succeeded: [], failed: [] };
    // Prefer HIGH priority first
    const ordered = [...ids].sort((a, b) => {
      try {
        return priorityRank(getActive(a).priority) - priorityRank(getActive(b).priority);
      } catch {
        return 0;
      }
    });
    for (const id of ordered) {
      try {
        await demoApi.startTask(id);
        response.succeeded.push(id);
      } catch (e) {
        response.failed.push({ id, reason: e instanceof Error ? e.message : 'failed' });
      }
    }
    return response;
  },

  bulkDelete: async (ids: number[]): Promise<BulkActionResponse> => {
    const response: BulkActionResponse = { succeeded: [], failed: [] };
    for (const id of ids) {
      try {
        await demoApi.deleteTask(id);
        response.succeeded.push(id);
      } catch (e) {
        response.failed.push({ id, reason: e instanceof Error ? e.message : 'failed' });
      }
    }
    return response;
  },

  getExecutorStats: async (): Promise<ExecutorStats> => {
    seedIfEmpty();
    return loadExecutor();
  },

  resetDemoData: () => {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    cancelFlags.clear();
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(SEQ_KEY);
    localStorage.removeItem(EXEC_KEY);
    seedIfEmpty();
  },
};

export function isDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (import.meta.env.VITE_DEMO_MODE === 'false') return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('github.io') || (host === 'localhost' && import.meta.env.VITE_USE_DEMO === 'true');
}
