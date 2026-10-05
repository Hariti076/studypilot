import { priorityReason } from '../../utils/helpers';
import { RISK_PILL, RANK_RING } from './risk';

function hoursFor(name, plan) {
  if (!plan) return null;
  const minutes = plan.filter((item) => item.type === 'study' && item.subject === name).reduce((sum, item) => sum + item.minutes, 0);
  return Math.round((minutes / 60) * 10) / 10;
}

function probs(subject) {
  const raw = subject.riskProbabilities || {};
  return {
    high: Number(raw.High || 0),
    medium: Number(raw.Medium || 0),
    low: Number(raw.Low || 0),
  };
}

export default function SubjectRiskCards({ subjects, plan, weeklyBudget }) {
  const ranked = [...subjects].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <section aria-labelledby="risk-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h3 id="risk-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Subject priority and risk
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Subjects that need time sooner appear first.</p>
        </div>
        <span className="text-xs font-bold text-slate-400">{subjects.length} subjects evaluated</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ranked.map((subject, index) => {
          const rank = index + 1;
          const share = probs(subject);
          const hours = hoursFor(subject.name, plan);
          const budgetPct = hours != null && weeklyBudget ? Math.round((hours / weeklyBudget) * 100) : null;
          return (
            <article
              key={subject.name}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${RANK_RING[rank] || 'border-slate-200 dark:border-slate-800'}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${rank === 1 ? 'bg-rose-600' : 'bg-slate-800'}`}>
                    Priority #{rank}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${RISK_PILL[subject.risk] || RISK_PILL.Medium}`}>{subject.risk} risk</span>
                </div>
                <h4 className="mt-3 text-sm font-black leading-snug text-slate-900 dark:text-white">{subject.name}</h4>
                <p className="mt-1 text-[11px] text-slate-500">{priorityReason(subject)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Now</span>
                    <span className={`text-sm font-black ${subject.current < 60 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>{subject.current}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Projected with plan</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{subject.predicted}%</span>
                  </div>
                </div>
                {subject.riskProbabilities ? (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Risk</span>
                      <span className="text-rose-600">High {Math.round(share.high * 100)}%</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full bg-rose-500" style={{ width: `${share.high * 100}%` }} />
                      <div className="h-full bg-amber-400" style={{ width: `${share.medium * 100}%` }} />
                      <div className="h-full bg-emerald-400" style={{ width: `${share.low * 100}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Allocated time</span>
                  <span className="text-base font-black text-indigo-700 dark:text-indigo-300">{hours == null ? 'Plan pending' : `${hours}h / wk`}</span>
                </div>
                {budgetPct != null && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800">{budgetPct}% budget</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
