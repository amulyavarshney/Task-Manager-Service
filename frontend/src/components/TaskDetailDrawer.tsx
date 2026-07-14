import { useEffect } from 'react';
import type { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  task: Task;
  onClose: () => void;
  onStart: (id: number) => Promise<void>;
  onCancel?: (id: number) => Promise<void>;
  onReset?: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onPurge?: (id: number) => Promise<void>;
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
  const elapsedSec = (Date.now() - new Date(task.startedAt).getTime()) / 1000;
  const pct = Math.min(100, Math.round((elapsedSec / task.taskDuration) * 100));
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
        <span>Progress</span>
        <span>~{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{task.taskDuration}s total duration</p>
    </div>
  );
}

export function TaskDetailDrawer({ task, onClose, onStart, onCancel, onReset, onDelete, onPurge }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const waitTime = elapsed(task.createdAt, task.startedAt);
  const runTime = elapsed(task.startedAt, task.completedAt);

  const scheduledCountdown = (() => {
    if (!task.scheduledAt || task.taskStatus !== 'READY') return null;
    const ms = new Date(task.scheduledAt).getTime() - Date.now();
    if (ms <= 0) return 'Due now';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `Runs in ${h}h ${m}m` : `Runs in ${m}m`;
  })();

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 shadow-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Task Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">
          {/* Name & badges */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words">{task.taskName}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">ID #{task.taskId}</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={task.taskStatus} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          <ProgressBar task={task} />

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Timeline</p>
            <div className="space-y-3">
              <TimelineRow icon="circle" color="slate" label="Created" value={fmt(task.createdAt)} />
              {task.scheduledAt && (
                <TimelineRow
                  icon="clock"
                  color="amber"
                  label="Scheduled"
                  value={fmt(task.scheduledAt)}
                  sub={scheduledCountdown ?? undefined}
                />
              )}
              <TimelineRow icon="play" color="blue" label="Started" value={fmt(task.startedAt)}
                sub={task.startedAt ? `Wait: ${waitTime}` : undefined} />
              <TimelineRow icon="check" color="emerald" label="Completed" value={fmt(task.completedAt)}
                sub={task.completedAt ? `Run time: ${runTime}` : undefined} />
              {task.deletedAt && (
                <TimelineRow icon="trash" color="red" label="Deleted" value={fmt(task.deletedAt)} />
              )}
            </div>
          </div>

          {/* Result message */}
          {task.resultMessage && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Result</p>
              <p className={`text-sm rounded-lg px-3 py-2 border ${
                task.resultMessage.startsWith('Completed')
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}>
                {task.resultMessage}
              </p>
            </div>
          )}

          {/* Config */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Configuration</p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 divide-y divide-slate-200 dark:divide-slate-600">
              <Row label="Duration" value={`${task.taskDuration}s`} />
              <Row label="Priority" value={task.priority ?? 'MEDIUM'} />
              {task.maxRetries > 0 && (
                <Row label="Retries" value={`${task.retryCount} / ${task.maxRetries}`} />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 sticky bottom-0 bg-white dark:bg-slate-800">
          {!task.deletedAt && task.taskStatus === 'READY' && (
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
          {!task.deletedAt && task.taskStatus === 'IN_PROGRESS' && onCancel && (
            <button
              onClick={() => onCancel(task.taskId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
          )}
          {!task.deletedAt && (task.taskStatus === 'FAILED' || task.taskStatus === 'DONE') && onReset && (
            <button
              onClick={() => onReset(task.taskId)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
          {!task.deletedAt && (
            <button
              onClick={() => onDelete(task.taskId)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 hover:border-red-200 dark:hover:border-red-700 transition-colors"
            >
              Delete
            </button>
          )}
          {task.deletedAt && onPurge && (
            <button
              onClick={() => onPurge(task.taskId)}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Purge permanently
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ icon, color, label, value, sub }: {
  icon: 'circle' | 'play' | 'check' | 'clock' | 'trash';
  color: 'slate' | 'blue' | 'emerald' | 'amber' | 'red';
  label: string;
  value: string;
  sub?: string;
}) {
  const colorMap = {
    slate: 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400',
    blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    red: 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400',
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full ${colorMap[color]} flex items-center justify-center shrink-0 mt-0.5`}>
        {icon === 'circle' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        {icon === 'clock' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {icon === 'trash' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
        {icon === 'play' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
        {icon === 'check' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
