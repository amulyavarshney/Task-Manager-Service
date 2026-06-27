import type { TaskStatus } from '../types';

const config: Record<TaskStatus, { label: string; classes: string }> = {
  READY: {
    label: 'Ready',
    classes: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    classes: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  DONE: {
    label: 'Done',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  FAILED: {
    label: 'Failed',
    classes: 'bg-red-50 text-red-700 border border-red-200',
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, classes } = config[status] ?? config.READY;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status === 'IN_PROGRESS' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {status === 'FAILED' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      )}
      {label}
    </span>
  );
}
