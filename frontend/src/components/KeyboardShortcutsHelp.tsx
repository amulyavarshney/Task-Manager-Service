import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

const shortcuts = [
  { key: 'N',   description: 'New task' },
  { key: '/',   description: 'Focus search' },
  { key: 'R',   description: 'Refresh tasks' },
  { key: 'D',   description: 'Toggle dark mode' },
  { key: 'Esc', description: 'Close modal / drawer' },
  { key: '?',   description: 'Show this help' },
];

export function KeyboardShortcutsHelp({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-slate-600 dark:text-slate-300">{description}</span>
              <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          Shortcuts are disabled while typing in inputs.
        </p>
      </div>
    </div>
  );
}
