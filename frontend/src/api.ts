import type { Task, CreateTaskRequest, UpdateTaskRequest, ExecutorStats, PagedTaskResponse, TaskStats, TaskStatus, TaskPriority, BulkActionResponse } from './types';
import { demoApi, isDemoMode } from './demoApi';

export interface TaskListParams {
  page?: number;
  size?: number;
  sort?: string;
  status?: TaskStatus | 'ALL';
  priority?: TaskPriority;
  search?: string;
  tag?: string;
}

const API_KEY_STORAGE = 'taskmanager.apiKey';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? (import.meta.env.VITE_API_KEY as string | undefined) ?? '';
}

export function setApiKey(key: string) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

export { isDemoMode };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${base}${url}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.title || err.message || message;
    } catch { /* use default */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function buildQuery(params?: TaskListParams): string {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.size !== undefined) qs.set('size', String(params.size));
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.search) qs.set('search', params.search);
  if (params?.tag) qs.set('tag', params.tag);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

const liveApi = {
  listTasks: (params?: TaskListParams) =>
    request<PagedTaskResponse>(`/api/tasks${buildQuery(params)}`),
  getTask: (id: number) => request<Task>(`/api/tasks/${id}`),
  getTaskStats: () => request<TaskStats>('/api/tasks/stats'),
  createTask: (body: CreateTaskRequest) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: UpdateTaskRequest) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  purgeTask: (id: number) => request<void>(`/api/tasks/${id}/purge`, { method: 'DELETE' }),
  startTask: (id: number) => request<Task>(`/api/tasks/${id}/start`, { method: 'POST' }),
  cancelTask: (id: number) => request<Task>(`/api/tasks/${id}/cancel`, { method: 'POST' }),
  resetTask: (id: number) => request<Task>(`/api/tasks/${id}/reset`, { method: 'POST' }),
  bulkStart: (ids: number[]) =>
    request<BulkActionResponse>('/api/tasks/bulk/start', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkDelete: (ids: number[]) =>
    request<BulkActionResponse>('/api/tasks/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getExecutorStats: () => request<ExecutorStats>('/api/executor/stats'),
  getHistory: (params?: TaskListParams) =>
    request<PagedTaskResponse>(`/api/tasks/history${buildQuery(params)}`),
};

function pickApi() {
  return isDemoMode() ? demoApi : liveApi;
}

export const api = {
  listTasks: (params?: TaskListParams) => pickApi().listTasks(params),
  getTask: (id: number) => pickApi().getTask(id),
  getTaskStats: () => pickApi().getTaskStats(),
  createTask: (body: CreateTaskRequest) => pickApi().createTask(body),
  updateTask: (id: number, body: UpdateTaskRequest) => pickApi().updateTask(id, body),
  deleteTask: (id: number) => pickApi().deleteTask(id),
  purgeTask: (id: number) => pickApi().purgeTask(id),
  startTask: (id: number) => pickApi().startTask(id),
  cancelTask: (id: number) => pickApi().cancelTask(id),
  resetTask: (id: number) => pickApi().resetTask(id),
  bulkStart: (ids: number[]) => pickApi().bulkStart(ids),
  bulkDelete: (ids: number[]) => pickApi().bulkDelete(ids),
  getExecutorStats: () => pickApi().getExecutorStats(),
  getHistory: (params?: TaskListParams) => pickApi().getHistory(params),
  resetDemoData: () => {
    if (isDemoMode()) demoApi.resetDemoData();
  },
};
