import { AlertTriangle, Flame, Gauge, Hourglass, Lightbulb, Rocket, ShieldCheck, Sprout, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import { RISK_STYLES } from '../../utils/helpers';

const RISK_ICON = { High: AlertTriangle, Medium: Gauge, Low: ShieldCheck };
const RISK_COPY = {
  High: 'Your current routine puts results at risk. Your plan prioritises the weakest subjects first.',
  Medium: "You're close — consistent study should lift your weaker subjects.",
  Low: "You're on track. Stay consistent and keep revising.",
};
const PERSONA_ICON = { trophy: Trophy, hourglass: Hourglass, flame: Flame, sprout: Sprout, rocket: Rocket };

function CardShell({ label, children, className = '', style }) {
  return (
    <article className={`card animate-fade-up !p-5 ${className}`} style={style}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {children}
    </article>
  );
}

export default function SummaryCards({ prediction }) {
  const { risk, persona, summary } = prediction;
  const rs = RISK_STYLES[risk];
  const RiskIcon = RISK_ICON[risk];
  const PersonaIcon = PERSONA_ICON[persona.icon] || Target;
  const delta = summary.avgPredicted - summary.avgCurrent;
  const Trend = delta >= 0 ? TrendingUp : TrendingDown;

  return (
    <section aria-label="Summary" className="grid gap-4 md:grid-cols-3">
      <CardShell label="Predicted score">
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{summary.avgPredicted}</span>
          <span className="text-xl font-medium text-slate-400">%</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Trend className={`h-4 w-4 ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className={delta >= 0 ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-500'}>
            {delta >= 0 ? '+' : ''}
            {delta}
          </span>
          vs your current {summary.avgCurrent}% average
        </p>
        <div className="mt-4">
          <ProgressBar value={summary.avgPredicted} color={rs.bar} label="Average predicted score" />
        </div>
      </CardShell>

      <CardShell label="Risk level" className={`border ${rs.banner}`} style={{ animationDelay: '60ms' }}>
        <div className="mt-3 flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${rs.iconWrap}`}>
            <RiskIcon className="h-6 w-6" />
          </span>
          <div>
            <p className={`text-3xl font-bold leading-none ${rs.text}`}>{risk}</p>
            <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${rs.badge}`}>{rs.label}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{RISK_COPY[risk]}</p>
      </CardShell>

      <CardShell label="Your persona" style={{ animationDelay: '120ms' }}>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            <PersonaIcon className="h-6 w-6" />
          </span>
          <p className="text-xl font-bold leading-tight text-slate-900 dark:text-white">{persona.name}</p>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{persona.description}</p>
        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          {persona.tip}
        </p>
      </CardShell>
    </section>
  );
}
