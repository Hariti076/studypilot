import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { buildSuggestions } from '../../utils/suggestions';

const CATEGORY = {
  Practice: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
  'How to study': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200',
  Attendance: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  Recovery: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  Routine: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200',
  Time: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200',
  'This week': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  Exam: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
};

export default function StudySuggestions({ prediction, showPlanLink = false }) {
  const cards = buildSuggestions(prediction);
  if (!cards.length) return null;

  return (
    <section aria-labelledby="suggestions-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h3 id="suggestions-title" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Ways to improve your studying
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Suggestions from your predicted scores, risk, and habits. Each one says why it applies to you.</p>
        </div>
        {showPlanLink && (
          <Link to="/planner" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
            Open the weekly plan
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <article key={card.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY[card.category] || CATEGORY['This week']}`}>{card.category}</span>
            <h4 className="mt-3 text-sm font-black leading-snug text-slate-900 dark:text-white">{card.title}</h4>
            <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <span className="font-bold">Why this suggestion? </span>
              {card.why}
            </p>
            <ol className="mt-4 space-y-2">
              {card.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                  <span className="font-black text-emerald-600 dark:text-emerald-300">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
