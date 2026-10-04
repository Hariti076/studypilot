import { Brain, CalendarPlus, Loader2, RefreshCw } from 'lucide-react';

const RISK_ORDER = { High: 2, Medium: 1, Low: 0 };

function studyHours(plan) {
  if (!plan?.length) return null;
  const minutes = plan.filter((item) => item.type === 'study').reduce((sum, item) => sum + item.minutes, 0);
  return Math.round((minutes / 60) * 10) / 10;
}

export default function StudyHero({ prediction, plan, stats, onRecalculate, recalculating }) {
  const weeklyBudget = Math.round(prediction.profile.dailyHours * 7 * 10) / 10;
  const planned = studyHours(plan);
  const highest = [...prediction.subjects].sort(
    (a, b) => (RISK_ORDER[b.risk] ?? 0) - (RISK_ORDER[a.risk] ?? 0) || b.priorityScore - a.priorityScore
  )[0];
  const progress = plan ? stats?.pct ?? 0 : 0;
  const doneHours = plan ? Math.round(((stats?.minutesDone ?? 0) / 60) * 10) / 10 : 0;
  const modelLine = 'Your week is built from the projected scores, the risk level, and the study style that fits your routine.';

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-indigo-950/30 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
            <Brain className="h-4 w-4" /> ML study planner
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-medium leading-[1.05] sm:text-5xl">A week aimed at the subjects that need it</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{modelLine}</p>
          {prediction.persona && (
            <p className="mt-3 text-sm text-indigo-100">
              <span className="font-semibold text-white">{prediction.persona.name}.</span> {prediction.persona.tip}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
          <p className="px-1 text-xs font-semibold text-slate-200">
            Weekly budget <span className="text-white">{weeklyBudget}h</span>
            <span className="block font-medium text-slate-400">{prediction.profile.dailyHours}h each day</span>
          </p>
          <button
            type="button"
            onClick={onRecalculate}
            disabled={recalculating || !onRecalculate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : plan ? <RefreshCw className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
            {recalculating ? 'Building plan…' : plan ? 'Rebuild plan' : 'Build weekly plan'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Planned hours" value={planned == null ? '—' : `${planned}h`} hint={`Within a ${weeklyBudget}-hour week`} />
        <Stat label="Highest priority" value={highest?.name || '—'} hint={highest ? `${highest.risk} risk` : 'Add a subject'} tone="text-rose-300" />
        <Stat
          label="Week progress"
          value={plan ? `${doneHours} / ${planned}h` : 'Not started'}
          hint={plan ? `${progress}% of sessions` : 'Generate the plan to track'}
          bar={progress}
        />
        <Stat label="Projected with plan" value={`${prediction.summary.avgPredicted}%`} hint={`Current average ${prediction.summary.avgCurrent}%`} tone="text-indigo-200" />
      </div>
    </section>
  );
}

function Stat({ label, value, hint, tone = 'text-white', bar }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`mt-1 block truncate text-lg font-black sm:text-xl ${tone}`}>{value}</span>
      {bar != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${bar}%` }} />
        </div>
      )}
      <span className="mt-1 block text-[10px] font-medium text-slate-400">{hint}</span>
    </div>
  );
}
