import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, ListChecks, Loader2, SlidersHorizontal } from 'lucide-react';
import { useGeneratePlan } from '../../hooks/useGeneratePlan';
import { useStudy } from '../../hooks/useStudy';

const tileBase =
  'group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-400/60 dark:focus-visible:ring-indigo-500/30';

function Tile({ icon: Icon, title, text, tone }) {
  return (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
    </>
  );
}

export default function QuickActions() {
  const { plan } = useStudy();
  const { generate, planning } = useGeneratePlan({ navigateToPlanner: true });

  return (
    <section aria-labelledby="actions-title">
      <h2 id="actions-title" className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
        Quick actions
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <button type="button" onClick={generate} disabled={planning} className={`${tileBase} disabled:cursor-wait disabled:opacity-70`}>
          <Tile
            icon={planning ? Loader2 : CalendarPlus}
            title={planning ? 'Generating…' : plan ? 'Regenerate plan' : 'Generate plan'}
            text={plan ? 'Build a fresh weekly timetable' : 'Build your weekly timetable'}
            tone={`bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300 ${planning ? '[&>svg]:animate-spin' : ''}`}
          />
        </button>
        <Link to="/progress" className={tileBase}>
          <Tile icon={ListChecks} title="View progress" text="Streaks, tasks and study hours" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" />
        </Link>
        <Link to="/inputs" className={tileBase}>
          <Tile icon={SlidersHorizontal} title="Update inputs" text="Change subjects, hours or sleep" tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300" />
        </Link>
      </div>
    </section>
  );
}
