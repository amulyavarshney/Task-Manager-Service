import type { Task, CreateTaskRequest, UpdateTaskRequest, ExecutorStats, PagedTaskResponse, TaskStats, TaskStatus, TaskPriority } from './types';

export interface TaskListParams {
  page?: number;
  size?: number;
  sort?: string;
  status?: TaskStatus | 'ALL';
  priority?: TaskPriority;
  search?: string;
  tag?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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

export const api = {
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
  resetTask: (id: number) => request<Task>(`/api/tasks/${id}/reset`, { method: 'POST' }),
  getExecutorStats: () => request<ExecutorStats>('/api/executor/stats'),
  getHistory: (params?: TaskListParams) =>
    request<PagedTaskResponse>(`/api/tasks/history${buildQuery(params)}`),
};
