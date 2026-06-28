export type TaskStatus = 'READY' | 'IN_PROGRESS' | 'DONE' | 'FAILED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  taskId: number;
  taskName: string;
  taskDuration: number;
  taskStatus: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  resultMessage: string | null;
  maxRetries: number;
  retryCount: number;
  scheduledAt: string | null;
}

export interface CreateTaskRequest {
  taskName: string;
  taskDuration: number;
  priority?: TaskPriority;
  tags?: string[];
  maxRetries?: number;
  scheduledAt?: string | null;
}

export interface UpdateTaskRequest {
  taskName?: string;
  taskDuration?: number;
  priority?: TaskPriority;
  tags?: string[];
  maxRetries?: number;
  scheduledAt?: string | null;
}

export interface ExecutorStats {
  corePoolSize: number;
  maxPoolSize: number;
  activeCount: number;
  poolSize: number;
  queueSize: number;
  queueCapacity: number;
  completedTaskCount: number;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface PagedTaskResponse {
  content: Task[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type SortField = 'createdAt' | 'taskName' | 'taskDuration' | 'priority' | 'taskStatus';
export type SortDir = 'asc' | 'desc';

export interface TaskTemplate {
  id: string;
  name: string;
  taskName: string;
  taskDuration: number;
  priority: TaskPriority;
  tags: string[];
  maxRetries: number;
}
