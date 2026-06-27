import { useState, useEffect } from 'react';
import type { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskFormModal } from './TaskFormModal';

interface Props {
  task: Task;
  onStart: (id: number) => Promise<void>;
  onUpdate: (id: number, name: string, duration: number, priority: Task['priority'], tags: string[], maxRetries: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onViewDetail: (task: Task) => void;
}

function ProgressBar({ task }: { task: Task }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (task.taskStatus !== 'IN_PROGRESS' || !task.startedAt) { setPct(0); return; }
    const update = () => {
      const elapsed = (Date.now() - new Date(task.startedAt!).getTime()) / 1000;
      setPct(Math.min(100, Math.round((elapsed / task.taskDuration) * 100)));
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [task]);

  if (task.taskStatus !== 'IN_PROGRESS') return null;

  return (
    <div className="mt-3 mb-1">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Running…</span>
        <span>~{pct}%</span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TaskCard({ task, onStart, onUpdate, onDelete, onViewDetail }: Props) {
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = task.taskStatus === 'READY';
  const canStart = task.taskStatus === 'READY';

  async function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    setStarting(true);
    setActionError('');
    try {
      await onStart(task.taskId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setStarting(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${task.taskName}"?`)) return;
    setDeleting(true);
    setActionError('');
    try {
      await onDelete(task.taskId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete task');
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 cursor-pointer group"
        onClick={() => onViewDetail(task)}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {task.taskName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">ID #{task.taskId}</p>
          </div>
          <StatusBadge status={task.taskStatus} />
        </div>

        <div className="flex flex-wrap gap-2 mb-3 mt-2">
          <PriorityBadge priority={task.priority} />
          {task.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200">
              {tag}
            </span>
          ))}
          {(task.tags?.length ?? 0) > 2 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full border border-slate-200">
              +{task.tags.length - 2}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          <span>{task.taskDuration}s</span>
        </div>

        <ProgressBar task={task} />

        {actionError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mt-3">
            {actionError}
          </p>
        )}

        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          {canStart && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {starting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run
                </>
              )}
            </button>
          )}

          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-sm hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            title="Delete"
          >
            {deleting ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-red-400 rounded-full animate-spin block" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {editing && (
        <TaskFormModal
          task={task}
          onSave={(name, duration, priority, tags, maxRetries) => onUpdate(task.taskId, name, duration, priority, tags, maxRetries)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
