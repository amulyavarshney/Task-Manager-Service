import type { ExecutorStats } from '../types';

interface Props {
  stats: ExecutorStats | null;
  loading: boolean;
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold text-slate-800 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</span>
      {sub && <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>}
    </div>
  );
}

export function ExecutorPanel({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-40 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const queuePct = stats.queueCapacity > 0
    ? Math.round((stats.queueSize / stats.queueCapacity) * 100)
    : 0;
  const threadPct = stats.maxPoolSize > 0
    ? Math.round((stats.activeCount / stats.maxPoolSize) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Thread Pool
        </h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          stats.activeCount > 0
            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {stats.activeCount > 0 ? `${stats.activeCount} running` : 'idle'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <Stat label="Active threads" value={stats.activeCount} sub={`/ ${stats.maxPoolSize} max`} />
        <Stat label="Pool size" value={stats.poolSize} sub={`${stats.corePoolSize} core`} />
        <Stat label="Queue" value={stats.queueSize} sub={`/ ${stats.queueCapacity} cap`} />
        <Stat label="Completed" value={stats.completedTaskCount} />
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Threads</span>
            <span>{threadPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                threadPct > 80 ? 'bg-red-400' : threadPct > 50 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${threadPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Queue</span>
            <span>{queuePct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                queuePct > 80 ? 'bg-red-400' : queuePct > 50 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${queuePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
