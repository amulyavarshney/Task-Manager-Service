import { useState, useEffect } from 'react';
import type { Task, TaskPriority } from '../types';

interface Props {
  task?: Task;
  onSave: (name: string, duration: number, priority: TaskPriority, tags: string[], maxRetries: number) => Promise<void>;
  onClose: () => void;
}

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const priorityLabels: Record<TaskPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
const priorityColors: Record<TaskPriority, string> = {
  LOW: 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-700 data-[selected=true]:border-slate-400',
  MEDIUM: 'border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 data-[selected=true]:bg-amber-50 dark:data-[selected=true]:bg-amber-900/40 data-[selected=true]:border-amber-400',
  HIGH: 'border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 data-[selected=true]:bg-red-50 dark:data-[selected=true]:bg-red-900/40 data-[selected=true]:border-red-400',
};

const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export function TaskFormModal({ task, onSave, onClose }: Props) {
  const [name, setName] = useState(task?.taskName ?? '');
  const [duration, setDuration] = useState(task?.taskDuration ?? 5);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [maxRetries, setMaxRetries] = useState(task?.maxRetries ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Task name is required'); return; }
    if (duration < 1) { setError('Duration must be at least 1 second'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(name.trim(), duration, priority, tags, maxRetries);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-5">
          {task ? 'Edit Task' : 'New Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Task Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Process monthly report"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Duration (seconds)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">How many seconds the task will run</p>
          </div>

          <div>
            <label className={labelCls}>Max Retries</label>
            <input
              type="number"
              min={0}
              max={10}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Math.max(0, Math.min(10, Number(e.target.value))))}
              className={inputCls}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">How many times to retry on failure (0 = no retries)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-selected={priority === p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${priorityColors[p]}`}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Tags</label>
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs rounded-full border border-slate-200 dark:border-slate-500"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-100">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Type tag + Enter"
                className="w-full text-sm outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
