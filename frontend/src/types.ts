export type TaskStatus = 'READY' | 'IN_PROGRESS' | 'DONE';
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
}

export interface CreateTaskRequest {
  taskName: string;
  taskDuration: number;
  priority?: TaskPriority;
  tags?: string[];
}

export interface UpdateTaskRequest {
  taskName?: string;
  taskDuration?: number;
  priority?: TaskPriority;
  tags?: string[];
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
