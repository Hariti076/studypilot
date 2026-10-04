import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { todayName } from '../../utils/helpers';

/** Today's study blocks, ticked off from the same progress as the planner. */
export default function TodayBoard({ plan, done, onToggle }) {
  const today = todayName();
  const items = (plan || []).filter((item) => item.day === today && item.type === 'study');
  const finished = items.filter((item) => done[item.id]).length;

  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-6" aria-labelledby="today-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">{today}</p>
          <h2 id="today-title" className="mt-1 text-3xl font-medium text-slate-900 dark:text-white">Today’s sessions</h2>
        </div>
        {items.length > 0 && (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {finished} of {items.length} done
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {plan ? 'Nothing left on today’s plan.' : 'Build the weekly plan to see today’s blocks here.'}{' '}
          <Link to="/planner" className="font-semibold text-indigo-600 dark:text-indigo-300">
            Open the planner
          </Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {items.map((item) => {
            const checked = !!done[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  aria-pressed={checked}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    checked
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/60'
                  }`}
                >
                  {checked ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />}
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold text-slate-900 dark:text-white ${checked ? 'line-through opacity-60' : ''}`}>{item.subject}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {item.time} · {item.task}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
