import type { Task, TaskStatus } from '../types';

const statusOrder: TaskStatus[] = ['READY', 'IN_PROGRESS', 'DONE', 'FAILED'];
const labels: Record<TaskStatus, string> = { READY: 'Ready', IN_PROGRESS: 'In Progress', DONE: 'Done', FAILED: 'Failed' };
const colors: Record<TaskStatus, string> = {
  READY: 'text-slate-600',
  IN_PROGRESS: 'text-blue-600',
  DONE: 'text-emerald-600',
  FAILED: 'text-red-600',
};

interface Props {
  tasks: Task[];
  selected: Set<number>;
  onBulkStart: () => void;
  onBulkDelete: () => void;
}

export function StatsBar({ tasks, selected, onBulkStart, onBulkDelete }: Props) {
  const counts = tasks.reduce<Record<TaskStatus, number>>(
    (acc, t) => { acc[t.taskStatus]++; return acc; },
    { READY: 0, IN_PROGRESS: 0, DONE: 0, FAILED: 0 }
  );

  const readySelected = tasks.filter((t) => selected.has(t.taskId) && t.taskStatus === 'READY').length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-5 flex-wrap">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800 text-lg">{tasks.length}</span>{' '}total
        </div>
        {statusOrder.map((s) => (
          <div key={s} className={`text-sm ${colors[s]}`}>
            <span className="font-semibold text-lg">{counts[s]}</span>{' '}{labels[s]}
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
          <span className="text-xs font-medium text-blue-700">{selected.size} selected</span>
          {readySelected > 0 && (
            <button
              onClick={onBulkStart}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Run {readySelected}
            </button>
          )}
          <button
            onClick={onBulkDelete}
            className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1"
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
