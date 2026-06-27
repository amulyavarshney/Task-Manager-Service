import { useEffect } from 'react';
import type { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  task: Task;
  onClose: () => void;
  onStart: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function elapsed(a: string | null, b: string | null): string {
  if (!a || !b) return '—';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ProgressBar({ task }: { task: Task }) {
  if (task.taskStatus !== 'IN_PROGRESS' || !task.startedAt) return null;
  const elapsed = (Date.now() - new Date(task.startedAt).getTime()) / 1000;
  const pct = Math.min(100, Math.round((elapsed / task.taskDuration) * 100));
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>Progress</span>
        <span>~{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{task.taskDuration}s total duration</p>
    </div>
  );
}

export function TaskDetailDrawer({ task, onClose, onStart, onDelete }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const waitTime = elapsed(task.createdAt, task.startedAt);
  const runTime = elapsed(task.startedAt, task.completedAt);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full max-w-sm bg-white shadow-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-800">Task Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">
          {/* Name & badges */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 break-words">{task.taskName}</h3>
            <p className="text-xs text-slate-400 mb-3">ID #{task.taskId}</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={task.taskStatus} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          {/* Progress bar for in-progress tasks */}
          <ProgressBar task={task} />

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Timeline</p>
            <div className="space-y-3">
              <TimelineRow
                icon="circle"
                color="slate"
                label="Created"
                value={fmt(task.createdAt)}
              />
              <TimelineRow
                icon="play"
                color="blue"
                label="Started"
                value={fmt(task.startedAt)}
                sub={task.startedAt ? `Wait: ${waitTime}` : undefined}
              />
              <TimelineRow
                icon="check"
                color="emerald"
                label="Completed"
                value={fmt(task.completedAt)}
                sub={task.completedAt ? `Run time: ${runTime}` : undefined}
              />
            </div>
          </div>

          {/* Result message */}
          {task.resultMessage && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Result</p>
              <p className={`text-sm rounded-lg px-3 py-2 border ${
                task.resultMessage.startsWith('Completed')
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {task.resultMessage}
              </p>
            </div>
          )}

          {/* Config */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Configuration</p>
            <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
              <Row label="Duration" value={`${task.taskDuration}s`} />
              <Row label="Priority" value={task.priority ?? 'MEDIUM'} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 flex gap-2 sticky bottom-0 bg-white">
          {task.taskStatus === 'READY' && (
            <button
              onClick={() => onStart(task.taskId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Task
            </button>
          )}
          <button
            onClick={() => onDelete(task.taskId)}
            className="px-4 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  icon, color, label, value, sub,
}: {
  icon: 'circle' | 'play' | 'check';
  color: 'slate' | 'blue' | 'emerald';
  label: string;
  value: string;
  sub?: string;
}) {
  const colorMap = {
    slate: 'bg-slate-200 text-slate-500',
    blue: 'bg-blue-100 text-blue-500',
    emerald: 'bg-emerald-100 text-emerald-600',
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full ${colorMap[color]} flex items-center justify-center shrink-0 mt-0.5`}>
        {icon === 'circle' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        {icon === 'play' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {icon === 'check' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
