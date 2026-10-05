import { Compass, Flame, ScanSearch, Sparkles, Target } from 'lucide-react';
import { focusLine, PERSONA_SCHEDULE, priorityReason } from '../../utils/helpers';
import { PERSONA_METHODS } from '../../utils/suggestions';

const RISK = {
  High: 'bg-rose-500 text-white',
  Medium: 'bg-amber-400 text-amber-950',
  Low: 'bg-emerald-500 text-white',
};

function habitPhrase(factor) {
  if (factor.direction === 'down') return `${factor.label} raised the risk.`;
  if (factor.direction === 'up') return `${factor.label} is holding the week up.`;
  return `${factor.label} nudged the risk.`;
}

function riskBecause(prediction, risk) {
  const down = (prediction.explanation?.scoreFactors || []).filter((factor) => factor.direction === 'down');
  if (down.length) return `${down.slice(0, 2).map(habitPhrase).join(' ')} That is why this week is ${risk} risk.`;
  const named = (prediction.explanation?.riskFactors || []).slice(0, 2);
  if (named.length) return `${named.map(habitPhrase).join(' ')} That is why this week is ${risk} risk.`;
  return `No single habit is dragging the week down, so this stays ${risk} risk.`;
}

export default function Insights({ prediction, stats, streak }) {
  const persona = prediction.persona || {};
  const ml = prediction.ml || {};
  const risk = ml.risk_level || prediction.risk || 'Medium';
  const score = ml.predicted_score ?? prediction.summary?.avgPredicted;
  const range = ml.score_range;
  const schedule = PERSONA_SCHEDULE[persona.name];
  const method = PERSONA_METHODS[persona.name];
  const tips = method?.steps?.slice(0, 3) || [];
  const helping = (prediction.explanation?.scoreFactors || []).filter((factor) => factor.direction === 'up').slice(0, 3);
  const against = (prediction.explanation?.scoreFactors || []).filter((factor) => factor.direction === 'down').slice(0, 3);
  const ranked = [...(prediction.subjects || [])].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).slice(0, 3);
  const today = stats?.today;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="insights-title">
      <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-500/40 blur-3xl" />
        <p className="relative inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          <Sparkles className="h-3.5 w-3.5" /> AI guide
        </p>
        <h2 id="insights-title" className="relative mt-3 max-w-3xl text-3xl font-medium leading-tight sm:text-4xl">
          {persona.name ? <>You are {persona.name}.</> : 'Your week, read as one student.'}
        </h2>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{riskBecause(prediction, risk)}</p>
        <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{focusLine(prediction)}</p>
        {schedule && <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-amber-100">{schedule}</p>}
        <div className="relative mt-5 flex flex-wrap items-end gap-3">
          <Stat label="AI read" value={score == null ? '—' : `${score}%`} hint={range ? `About ${range[0]}–${range[1]}. Not a single certain mark.` : 'A planning estimate, not a certain mark.'} />
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black ${RISK[risk] || RISK.Medium}`}>{risk} risk</span>
          {persona.name && <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">{persona.name}</span>}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <Story icon={ScanSearch} kicker="Why this risk" title={risk} text={persona.tip || persona.description || 'The week was read from attendance, sleep, hours, and habits together.'} />
        <Story icon={Compass} kicker="Study style" title={persona.name || 'Your routine'} text={(persona.description && !persona.description.includes('model') ? persona.description : persona.tip) || 'Sessions are shaped around how you actually study.'} />
        <Story icon={Target} kicker="First focus" title={ranked[0]?.name || 'Your subjects'} text={ranked[0] ? priorityReason(ranked[0]) : 'Add a subject to see what leads the week.'} />
      </div>

      {(helping.length > 0 || against.length > 0) && (
        <div className="flex flex-wrap gap-2 px-5 pb-2">
          {helping.map((factor) => (
            <span key={factor.label} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">{habitPhrase(factor)}</span>
          ))}
          {against.map((factor) => (
            <span key={factor.label} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">{habitPhrase(factor)}</span>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="grid gap-2 px-5 py-4 sm:grid-cols-3">
          {tips.map((tip) => (
            <p key={tip} className="rounded-2xl bg-indigo-50 px-3 py-3 text-sm text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-100">{tip}</p>
          ))}
        </div>
      )}

      {ranked.length > 0 && (
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-3">
          {ranked.map((subject) => (
            <article key={subject.name} className="rounded-2xl border border-slate-100 px-3 py-3 dark:border-slate-800">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${subject.priority === 'High' ? 'text-rose-600' : subject.priority === 'Low' ? 'text-emerald-600' : 'text-amber-600'}`}>{subject.priority} priority</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{subject.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{priorityReason(subject)}. Projected {subject.predicted}%.</p>
            </article>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800">
        <Meter icon={Flame} label="Streak" value={`${streak || 0}d`} />
        <Meter label="Week done" value={`${stats?.pct ?? 0}%`} />
        <Meter label="Today" value={today ? `${today.completed}/${today.total || 0}` : '—'} />
      </div>
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {hint && <p className="mt-0.5 max-w-[14rem] text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
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

function Meter({ icon: Icon, label, value }) {
  return (
    <div className="px-4 py-4">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
