export type TaskStatus = 'READY' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  taskId: number;
  taskName: string;
  taskDuration: number;
  taskStatus: TaskStatus;
}

export interface CreateTaskRequest {
  taskName: string;
  taskDuration: number;
}

export interface UpdateTaskRequest {
  taskName?: string;
  taskDuration?: number;
}
