export default function ModelFacts({ card }) {
  if (!card) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-labelledby="model-facts-title">
      <h3 id="model-facts-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">How the models were checked</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{card.dataset}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Fact title={card.regression.model} value={`R² ${card.regression.R2}`} detail={`MAE ${card.regression.MAE} · RMSE ${card.regression.RMSE}`} />
        <Fact title={card.classification.model} value={`${pct(card.classification.highRiskRecall)} recall`} detail={`Accuracy ${pct(card.classification.accuracy)} · F1 ${pct(card.classification.f1Macro)}`} />
        <Fact title={card.clustering.model} value={String(card.clustering.silhouette)} detail="Silhouette score" />
      </dl>
      <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">Notes for the report</summary>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <li>{card.split}</li>
          {card.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Fact({ title, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</dt>
      <dd className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</dd>
      <dd className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detail}</dd>
    </div>
  );
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}
