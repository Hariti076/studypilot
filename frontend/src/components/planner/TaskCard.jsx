import { CheckCircle2, Circle, Clock, Target } from 'lucide-react';
import { PRIORITY_STYLES } from '../../utils/helpers';

/** One study session: subject, time, duration, priority and a completion toggle. */
export default function TaskCard({ item, color, checked, onToggle }) {
  const pr = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Low;
  return (
    <div className={`rounded-xl p-3 text-sm transition-all duration-300 hover:shadow-md ${pr.card} ${checked ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-semibold ${color.soft}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
          <span className="truncate">{item.subject}</span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          aria-label={`Mark ${item.subject} on ${item.day} ${item.time} as ${checked ? 'not done' : 'done'}`}
          className="-m-1 shrink-0 rounded-full p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 dark:focus-visible:ring-indigo-500/30"
        >
          {checked ? (
            <CheckCircle2 key="done" className="h-6 w-6 animate-pop text-emerald-500" />
          ) : (
            <Circle key="todo" className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          )}
        </button>
      </div>

      <p className={`mt-2 leading-snug text-slate-700 transition dark:text-slate-200 ${checked ? 'line-through' : ''}`}>{item.task}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {item.time}
        </span>
        <span className="font-medium">{item.duration}</span>
      </div>

      {item.priority && (
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pr.badge}`}>
          {item.priority === 'High' && <Target className="h-3 w-3" />}
          {item.priority} priority
        </span>
      )}
    </div>
  );
}
