import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ListChecks } from 'lucide-react';
import DayChecklist from '../components/progress/DayChecklist';
import ProgressOverview from '../components/progress/ProgressOverview';
import StreakCard from '../components/progress/StreakCard';
import EmptyState from '../components/ui/EmptyState';
import { ProgressSkeleton } from '../components/ui/Skeleton';
import { useGeneratePlan } from '../hooks/useGeneratePlan';
import { useStudy } from '../hooks/useStudy';
import { useToast } from '../hooks/useToast';
import { todayName } from '../utils/helpers';

export default function Progress() {
  const { prediction, plan, done, toggleTask, resetProgress, stats, streak, planning } = useStudy();
  const { generate } = useGeneratePlan({ navigateToPlanner: true });
  const toast = useToast();
  const [day, setDay] = useState(todayName());

  if (planning) return <ProgressSkeleton />;

  if (!prediction) {
    return (
      <EmptyState icon={ListChecks} title="Nothing to track yet" text="Enter your study details and generate a plan — then tick off sessions here.">
        <Link to="/inputs" className="btn-primary">
          Enter my study details
        </Link>
      </EmptyState>
    );
  }

  if (!plan) {
    return (
      <EmptyState icon={CalendarPlus} title="No plan to track yet" text="Generate your weekly plan and your progress will show up here.">
        <button type="button" onClick={generate} className="btn-primary">
          <CalendarPlus className="h-4 w-4" /> Generate my plan
        </button>
      </EmptyState>
    );
  }

  const remaining = plan.filter((p) => p.type === 'study' && !done[p.id]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your progress</h1>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ProgressOverview
            stats={stats}
            day={day}
            onReset={() => {
              resetProgress();
              toast.info('Progress reset. Your streak history is kept.');
            }}
          />
          <DayChecklist plan={plan} subjects={prediction.subjects} done={done} onToggle={toggleTask} day={day} onDayChange={setDay} />
        </div>

        <aside className="space-y-5">
          <StreakCard stats={stats} streak={streak} />
          <section className="card">
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
              Remaining tasks <span className="text-sm font-normal text-slate-400">({remaining.length})</span>
            </h2>
            {remaining.length === 0 ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">All done — fantastic work this week!</p>
            ) : (
              <ul className="space-y-2">
                {remaining.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-300">{p.subject}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {p.day.slice(0, 3)} · {p.duration}
                    </span>
                  </li>
                ))}
                {remaining.length > 6 && <li className="text-xs text-slate-400">+ {remaining.length - 6} more</li>}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
