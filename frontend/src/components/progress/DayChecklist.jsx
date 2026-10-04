import { CheckCircle2, Circle } from 'lucide-react';
import { DAYS, SUBJECT_COLORS, todayName } from '../../utils/helpers';

export default function DayChecklist({ plan, subjects, done, onToggle, day, onDayChange }) {
  const today = todayName();
  const items = plan.filter((p) => p.type === 'study' && p.day === day);
  const colorOf = Object.fromEntries(subjects.map((s) => [s.name, SUBJECT_COLORS[s.colorIdx % SUBJECT_COLORS.length]]));

  return (
    <section className="card" aria-labelledby="checklist-title">
      <h2 id="checklist-title" className="text-base font-semibold text-slate-900 dark:text-white">
        {day === today ? "Today's checklist" : `${day}'s checklist`}
      </h2>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDayChange(d)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
              day === d
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {d.slice(0, 3)}
            {d === today && <span className="ml-1 opacity-70">•</span>}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {items.length === 0 && <li className="py-4 text-center text-sm text-slate-500">No sessions scheduled for this day.</li>}
        {items.map((p) => {
          const checked = !!done[p.id];
          const color = colorOf[p.subject] || SUBJECT_COLORS[0];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={checked}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition hover:border-indigo-300 dark:hover:border-indigo-400/60 ${
                  checked
                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {checked ? <CheckCircle2 key="d" className="h-6 w-6 shrink-0 animate-pop text-emerald-500" /> : <Circle key="t" className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-600" />}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${color.soft}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                      {p.subject}
                    </span>
                    <span className="text-xs text-slate-400">{p.time}</span>
                  </span>
                  <span className={`mt-1 block text-sm text-slate-700 dark:text-slate-300 ${checked ? 'line-through opacity-60' : ''}`}>{p.task}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{p.duration}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
