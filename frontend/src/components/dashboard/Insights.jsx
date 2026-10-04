import { Compass, ScanSearch, Sparkles, TriangleAlert } from 'lucide-react';

const RISK = {
  High: 'bg-rose-500 text-white',
  Medium: 'bg-amber-400 text-amber-950',
  Low: 'bg-emerald-500 text-white',
};

function habitsOf(prediction) {
  const explanation = prediction.explanation || {};
  const factors = [...(explanation.scoreFactors || []), ...(explanation.riskFactors || [])];
  const seen = new Set();
  return factors.filter((factor) => {
    if (factor.direction === 'toward' || seen.has(factor.label)) return false;
    seen.add(factor.label);
    return true;
  });
}

function noteFor(stats, streak) {
  if (!stats?.total) return null;
  if (stats.pct === 100) return 'Every session this week is done.';
  if (streak >= 3) return `${streak}-day streak. Keep that rhythm.`;
  if (stats.completed === 0) return 'Tick the first session and the week starts moving.';
  return null;
}

export default function Insights({ prediction, stats, streak }) {
  const persona = prediction.persona;
  const ml = prediction.ml || {};
  const risk = ml.risk_level || prediction.risk || 'Medium';
  const levers = (ml.levers || []).map((lever) => lever.label).filter(Boolean).slice(0, 4);
  const helping = habitsOf(prediction).filter((factor) => factor.direction === 'up');
  const against = habitsOf(prediction).filter((factor) => factor.direction === 'down');
  const note = noteFor(stats, streak);
  const style = persona?.name || 'your routine';

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="insights-title">
      <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
        <p className="relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          <Sparkles className="h-3.5 w-3.5" /> What's going on
        </p>
        <h2 id="insights-title" className="relative mt-3 max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">
          This week is <span className={`inline-block rounded-full px-3 py-0.5 align-middle text-[0.7em] font-black ${RISK[risk] || RISK.Medium}`}>{risk} risk</span>
          {persona?.name ? <>, so the plan uses the {style} style.</> : '.'}
        </h2>
        {persona?.tip && <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-slate-300">{persona.tip}</p>}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <Story icon={ScanSearch} kicker="Read you" title="One student" text="Subjects, attendance, sleep, hours, and habits, taken together." />
        <Story icon={TriangleAlert} kicker="Called it" title={`${risk} risk`} text="One call for the whole week, so the plan knows where to push." />
        <Story icon={Compass} kicker="Shaped the week" title={levers[0] || style} text={levers.length > 1 ? levers.slice(1, 3).join(' · ') : 'The sessions follow this study style.'} />
      </div>

      {(helping.length > 0 || against.length > 0 || levers.length > 0) && (
        <div className="space-y-4 px-5 pb-5">
          {(helping.length > 0 || against.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {helping.map((factor) => (
                <span key={factor.label} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Helping · {factor.label}
                </span>
              ))}
              {against.map((factor) => (
                <span key={factor.label} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
                  In the way · {factor.label}
                </span>
              ))}
            </div>
          )}
          {levers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {levers.map((label) => (
                <span key={label} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {note && <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{note}</p>}
    </section>
  );
}

function Story({ icon: Icon, kicker, title, text }) {
  return (
    <article className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <Icon className="h-4 w-4 text-indigo-500" />
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{kicker}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
    </article>
  );
}
