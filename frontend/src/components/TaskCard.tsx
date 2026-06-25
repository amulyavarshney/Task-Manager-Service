import { useState } from 'react';
import type { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { TaskFormModal } from './TaskFormModal';

interface Props {
  task: Task;
  onStart: (id: number) => Promise<void>;
  onUpdate: (id: number, name: string, duration: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TaskCard({ task, onStart, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = task.taskStatus === 'READY';
  const canStart = task.taskStatus === 'READY';

  async function handleStart() {
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

  async function handleDelete() {
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{task.taskName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">ID #{task.taskId}</p>
          </div>
          <StatusBadge status={task.taskStatus} />
        </div>

        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          <span>{task.taskDuration}s duration</span>
        </div>

        {actionError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mb-3">
            {actionError}
          </p>
        )}

        <div className="flex gap-2">
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
              onClick={() => setEditing(true)}
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
          onSave={(name, duration) => onUpdate(task.taskId, name, duration)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
