import type { Task, CreateTaskRequest, UpdateTaskRequest, ExecutorStats, PagedTaskResponse } from './types';

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

export const api = {
  listTasks: (params?: { page?: number; size?: number; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.size !== undefined) qs.set('size', String(params.size));
    if (params?.sort) qs.set('sort', params.sort);
    const query = qs.toString();
    return request<PagedTaskResponse>(`/api/tasks${query ? `?${query}` : ''}`);
  },
  getTask: (id: number) => request<Task>(`/api/tasks/${id}`),
  createTask: (body: CreateTaskRequest) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: UpdateTaskRequest) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  purgeTask: (id: number) => request<void>(`/api/tasks/${id}/purge`, { method: 'DELETE' }),
  startTask: (id: number) => request<Task>(`/api/tasks/${id}/start`, { method: 'POST' }),
  getExecutorStats: () => request<ExecutorStats>('/api/executor/stats'),
  getHistory: (params?: { page?: number; size?: number; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.size !== undefined) qs.set('size', String(params.size));
    if (params?.sort) qs.set('sort', params.sort);
    const query = qs.toString();
    return request<PagedTaskResponse>(`/api/tasks/history${query ? `?${query}` : ''}`);
  },
};
