import type { Task, CreateTaskRequest, UpdateTaskRequest } from './types';

const BASE = '/api/tasks';

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
    } catch {
      // use default message
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listTasks: () => request<Task[]>(BASE),
  getTask: (id: number) => request<Task>(`${BASE}/${id}`),
  createTask: (body: CreateTaskRequest) =>
    request<Task>(BASE, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: UpdateTaskRequest) =>
    request<Task>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id: number) => request<void>(`${BASE}/${id}`, { method: 'DELETE' }),
  startTask: (id: number) =>
    request<Task>(`${BASE}/${id}/start`, { method: 'POST' }),
};
