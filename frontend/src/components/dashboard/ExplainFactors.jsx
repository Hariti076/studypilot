const TONE = {
  down: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
  up: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  toward: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
};

function agrees(label) {
  return /(scores|hours|sessions|activities)$/i.test(label);
}

function sentence(item, riskLevel) {
  const plural = agrees(item.label);
  if (item.direction === 'down') return `${item.label} ${plural ? 'pull' : 'pulls'} the predicted score down.`;
  if (item.direction === 'up') return `${item.label} ${plural ? 'lift' : 'lifts'} the predicted score.`;
  return `${item.label} ${plural ? 'push' : 'pushes'} the risk label toward ${riskLevel}.`;
}

export default function ExplainFactors({ explanation }) {
  if (!explanation?.scoreFactors?.length) return null;
  const toward = explanation.riskFactors || [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-labelledby="explain-title">
      <h3 id="explain-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Why the model scored you this way</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{explanation.summary}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        From the saved model coefficients on your overall profile (previous score is the average of your subjects).
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FactorList title="Predicted score" items={explanation.scoreFactors} riskLevel={explanation.riskLevel} />
        <FactorList title={`Risk label: ${explanation.riskLevel}`} items={toward} riskLevel={explanation.riskLevel} />
      </div>
    </section>
  );
}

function FactorList({ title, items, riskLevel }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.label} className={`rounded-xl border px-3 py-2.5 text-sm ${TONE[item.direction] || TONE.toward}`}>
            {sentence(item, riskLevel)}
          </li>
        ))}
      </ul>
    </div>
  );
}
