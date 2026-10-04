export default function MlCard({ prediction }) {
  const ml = prediction.ml;
  if (!ml) return null;
  const probs = ml.risk_probabilities || {};
  const levers = ml.levers || [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-labelledby="ml-title">
      <h3 id="ml-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">What the models say</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Student-level predictions come from the trained models; subject projections are an estimate: current score + model-estimated gain from your recommended routine.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Persona</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{ml.persona}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ml.persona_tip}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Model score</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {ml.predicted_score}
            <span className="text-sm font-normal text-slate-500"> ({ml.score_range?.[0]}–{ml.score_range?.[1]})</span>
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Classifier risk: {ml.risk_level}</p>
          <p className="mt-1 text-xs text-slate-500">
            High {Math.round((probs.High || 0) * 100)}% · Medium {Math.round((probs.Medium || 0) * 100)}% · Low {Math.round((probs.Low || 0) * 100)}%
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Routine levers</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Combined gain {ml.plan_gain} marks, then shared across subjects.</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {levers.map((lever) => (
              <li key={lever.id}>
                {lever.label} <span className="text-slate-400">({lever.gain >= 0 ? '+' : ''}{lever.gain})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
