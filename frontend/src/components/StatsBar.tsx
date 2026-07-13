import type { TaskStatus, TaskStats } from '../types';

const statusOrder: TaskStatus[] = ['READY', 'IN_PROGRESS', 'DONE', 'FAILED'];
const labels: Record<TaskStatus, string> = { READY: 'Ready', IN_PROGRESS: 'In Progress', DONE: 'Done', FAILED: 'Failed' };
const colors: Record<TaskStatus, string> = {
  READY: 'text-slate-600 dark:text-slate-400',
  IN_PROGRESS: 'text-blue-600 dark:text-blue-400',
  DONE: 'text-emerald-600 dark:text-emerald-400',
  FAILED: 'text-red-600 dark:text-red-400',
};

interface Props {
  stats: TaskStats | null;
  selected: Set<number>;
  readySelected: number;
  onBulkStart: () => void;
  onBulkDelete: () => void;
}

export function StatsBar({ stats, selected, readySelected, onBulkStart, onBulkDelete }: Props) {
  const total = stats?.total ?? 0;
  const counts = stats?.byStatus ?? { READY: 0, IN_PROGRESS: 0, DONE: 0, FAILED: 0 };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-5 flex-wrap">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{total}</span>{' '}total
        </div>
        {statusOrder.map((s) => (
          <div key={s} className={`text-sm ${colors[s]}`}>
            <span className="font-semibold text-lg">{counts[s] ?? 0}</span>{' '}{labels[s]}
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{selected.size} selected</span>
          {readySelected > 0 && (
            <button
              onClick={onBulkStart}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Run {readySelected}
            </button>
          )}
          <button
            onClick={onBulkDelete}
            className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete {selected.size}
          </button>
        </div>
      )}
    </div>
  );
}
