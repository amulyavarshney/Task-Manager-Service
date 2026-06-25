import type { Task, TaskStatus } from '../types';

const statusOrder: TaskStatus[] = ['READY', 'IN_PROGRESS', 'DONE'];
const labels: Record<TaskStatus, string> = {
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};
const colors: Record<TaskStatus, string> = {
  READY: 'text-slate-600',
  IN_PROGRESS: 'text-blue-600',
  DONE: 'text-emerald-600',
};

export function StatsBar({ tasks }: { tasks: Task[] }) {
  const counts = tasks.reduce<Record<TaskStatus, number>>(
    (acc, t) => { acc[t.taskStatus]++; return acc; },
    { READY: 0, IN_PROGRESS: 0, DONE: 0 }
  );

  return (
    <div className="flex gap-6 flex-wrap">
      <div className="text-sm text-slate-500">
        <span className="font-semibold text-slate-800 text-lg">{tasks.length}</span>
        {' '}total
      </div>
      {statusOrder.map((s) => (
        <div key={s} className={`text-sm ${colors[s]}`}>
          <span className="font-semibold text-lg">{counts[s]}</span>
          {' '}{labels[s]}
        </div>
      ))}
    </div>
  );
}
