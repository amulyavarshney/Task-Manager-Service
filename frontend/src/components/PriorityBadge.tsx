import type { TaskPriority } from '../types';

const config: Record<TaskPriority, { label: string; classes: string }> = {
  LOW: {
    label: 'Low',
    classes: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
  MEDIUM: {
    label: 'Medium',
    classes: 'bg-amber-50 text-amber-600 border border-amber-200',
  },
  HIGH: {
    label: 'High',
    classes: 'bg-red-50 text-red-600 border border-red-200',
  },
};

export function PriorityBadge({ priority }: { priority: TaskPriority | null | undefined }) {
  if (!priority || !config[priority]) return null;
  const { label, classes } = config[priority];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
        {priority === 'HIGH' ? (
          <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : priority === 'LOW' ? (
          <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : (
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}
      </svg>
      {label}
    </span>
  );
}
