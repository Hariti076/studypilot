import { CheckCircle2, Circle, Coffee } from 'lucide-react';
import { DAYS, todayName } from '../../utils/helpers';

const PRIORITY_PILL = {
  High: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/30',
  Medium: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30',
};

/** Seven-day list: each focus block is a row you can tick off. */
export default function PlanGrid({ plan, done, onToggle }) {
  const today = todayName();
  const study = plan.filter((item) => item.type === 'study');
  const doneMinutes = study.filter((item) => done[item.id]).reduce((sum, item) => sum + item.minutes, 0);
  const totalMinutes = study.reduce((sum, item) => sum + item.minutes, 0);
  const pct = totalMinutes ? Math.round((doneMinutes / totalMinutes) * 100) : 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Personalized 7-day study schedule</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Focus blocks from the model outputs. Click a row to mark it done.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              {(doneMinutes / 60).toFixed(1)} / {(totalMinutes / 60).toFixed(1)} hours ({pct}%)
            </span>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {pct}%
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {DAYS.map((day) => {
          const items = plan.filter((item) => item.day === day);
          const dayStudy = items.filter((item) => item.type === 'study');
          const doneCount = dayStudy.filter((item) => done[item.id]).length;
          return (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {day}
                  {day === today && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Today</span>}
                </h4>
                <span className="text-[11px] font-bold text-slate-400">
                  {doneCount}/{dayStudy.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">Rest day</p>}
                {items.map((item) =>
                  item.type === 'break' ? (
                    <div key={item.id} className="flex items-center gap-2 px-2 text-[11px] text-slate-400">
                      <Coffee className="h-3.5 w-3.5" />
                      {item.task} · {item.duration}
                    </div>
                  ) : (
                    <SessionRow key={item.id} item={item} checked={!!done[item.id]} onToggle={() => onToggle(item.id)} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SessionRow({ item, checked, onToggle }) {
  return (
    <div
      className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
        checked ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-start gap-3 text-left sm:items-center" aria-pressed={checked}>
        {checked ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />}
        <span className="w-28 shrink-0">
          <span className="block text-xs font-black text-slate-900 dark:text-white">{item.time}</span>
          <span className={`mt-0.5 inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_PILL[item.priority] || PRIORITY_PILL.Medium}`}>{item.subject}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-xs font-black text-slate-900 dark:text-white ${checked ? 'text-slate-400 line-through' : ''}`}>
            {item.review && <span className="mr-1.5 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">Review</span>}
            {item.carried && <span className="mr-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">Moved</span>}
            {item.task}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{item.duration}</span>
        </span>
      </button>
      <span className="self-end rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 sm:self-auto">
        {item.priority} priority
      </span>
    </div>
  );
}
