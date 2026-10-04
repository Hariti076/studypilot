import { AlertTriangle, CheckCircle2, Info, Lightbulb, Sparkles } from 'lucide-react';
import { getAdaptiveMessages } from '../../utils/helpers';

const TYPES = {
  danger: { icon: AlertTriangle, cls: 'border-red-100 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200', iconCls: 'text-red-500' },
  warning: { icon: Info, cls: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200', iconCls: 'text-amber-500' },
  success: { icon: CheckCircle2, cls: 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200', iconCls: 'text-emerald-500' },
  info: { icon: Lightbulb, cls: 'border-indigo-100 bg-indigo-50 text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200', iconCls: 'text-indigo-500' },
};

function factorSentence(factor, riskLevel) {
  if (factor.direction === 'down') return `${factor.label} worked against this week.`;
  if (factor.direction === 'up') return `${factor.label} worked in your favour.`;
  return `${factor.label} pointed the risk toward ${riskLevel}.`;
}

function stepsFor(prediction) {
  const persona = prediction.persona;
  const ml = prediction.ml || {};
  const risk = ml.risk_level || prediction.risk;
  const levers = (ml.levers || []).map((lever) => lever.label).filter(Boolean);
  const steps = [
    'Read your subjects, attendance, sleep, study hours, and habits as one student.',
    `Marked this week as ${risk} risk.`,
  ];
  if (persona?.name) {
    steps.push(`Matched the study style “${persona.name}”. ${persona.description || persona.tip || ''}`.trim());
  }
  if (levers.length) {
    steps.push(`Shaped the week around ${levers.slice(0, 4).join(', ')}.`);
  }
  return steps;
}

export default function Insights({ prediction, stats, streak }) {
  const explanation = prediction.explanation || {};
  const factors = [...(explanation.scoreFactors || []), ...(explanation.riskFactors || [])];
  const seen = new Set();
  const habits = factors.filter((factor) => {
    if (seen.has(factor.label)) return false;
    seen.add(factor.label);
    return true;
  });
  const messages = getAdaptiveMessages(prediction, stats, streak);

  return (
    <section className="card" aria-labelledby="insights-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 id="insights-title" className="text-base font-semibold text-slate-900 dark:text-white">What the AI did</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">How your week was read and planned. This is the reasoning, not a score report.</p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {stepsFor(prediction).map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      {habits.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Habits it weighed</h3>
          <ul className="mt-2 space-y-2">
            {habits.map((factor) => (
              <li key={factor.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                {factorSentence(factor, explanation.riskLevel || prediction.risk)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {messages.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {messages.map((message, index) => {
            const tone = TYPES[message.type] || TYPES.info;
            const Icon = tone.icon;
            return (
              <li key={`${message.type}-${index}`} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone.cls}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconCls}`} />
                <span>{message.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
