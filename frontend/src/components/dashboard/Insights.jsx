import { AlertTriangle, CalendarDays, CheckCircle2, Info, Lightbulb, Target } from 'lucide-react';
import { RISK_STYLES, SUBJECT_COLORS, countdownLabel } from '../../utils/helpers';

const TYPES = {
  danger: { icon: AlertTriangle, cls: 'border-red-100 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200', iconCls: 'text-red-500' },
  warning: { icon: Info, cls: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200', iconCls: 'text-amber-500' },
  success: { icon: CheckCircle2, cls: 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200', iconCls: 'text-emerald-500' },
  info: { icon: Lightbulb, cls: 'border-indigo-100 bg-indigo-50 text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200', iconCls: 'text-indigo-500' },
};

export default function Insights({ messages, subjects }) {
  return (
    <section className="grid gap-5 lg:grid-cols-3" aria-labelledby="insights-title">
      <div className="card lg:col-span-2">
        <h2 id="insights-title" className="text-base font-semibold text-slate-900 dark:text-white">
          Insights
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Personalised feedback — updates as you complete sessions.</p>
        <ul className="space-y-2.5">
          {messages.map((m, i) => {
            const t = TYPES[m.type] || TYPES.info;
            const Icon = t.icon;
            return (
              <li key={`${m.type}-${i}`} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${t.cls}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.iconCls}`} />
                <span>{m.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Subjects</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Predicted score and exam countdown.</p>
        <ul className="space-y-3">
          {subjects.map((s) => {
            const r = RISK_STYLES[s.risk];
            return (
              <li key={s.name} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SUBJECT_COLORS[s.colorIdx % SUBJECT_COLORS.length].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {s.name}
                    {s.priority === 'High' && <Target className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label="High priority" />}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3 w-3" /> {countdownLabel(s.daysLeft)}
                    {s.scoreRange ? ` · ${s.scoreRange[0]}–${s.scoreRange[1]}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{s.predicted}%</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.badge}`}>{s.risk}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
