import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Download, Loader2 } from 'lucide-react';
import FocusTimer from '../components/planner/FocusTimer';
import PlanGrid from '../components/planner/PlanGrid';
import PrintablePlan from '../components/planner/PrintablePlan';
import StudyHero from '../components/planner/StudyHero';
import StudySuggestions from '../components/planner/StudySuggestions';
import EmptyState from '../components/ui/EmptyState';
import { PlannerSkeleton } from '../components/ui/Skeleton';
import { useGeneratePlan } from '../hooks/useGeneratePlan';
import { useStudy } from '../hooks/useStudy';
import { useToast } from '../hooks/useToast';
import { missedSessionCount, planToIcs, todayName } from '../utils/helpers';

export default function Planner() {
  const { prediction, plan, planStart, done, toggleTask, stats, rescheduleMissed } = useStudy();
  const { generate, planning } = useGeneratePlan();
  const toast = useToast();
  const missed = plan ? missedSessionCount(plan, done, planStart) : 0;
  const upcoming = plan?.find((item) => item.type === 'study' && !done[item.id] && item.day === todayName())
    || plan?.find((item) => item.type === 'study' && !done[item.id]);

  const downloadCalendar = () => {
    const blob = new Blob([planToIcs(plan)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-plan.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  const catchUp = () => {
    const moved = rescheduleMissed();
    if (!moved) toast.info('No missed sessions to move.');
    else toast.success(`Moved ${moved} missed session${moved === 1 ? '' : 's'} onto the days still ahead.`);
  };

  if (!prediction) {
    return (
      <EmptyState icon={CalendarDays} title="No study details yet" text="Add your subjects and routine first, then we can build your weekly plan.">
        <Link to="/inputs" className="btn-primary">
          Enter my study details
        </Link>
      </EmptyState>
    );
  }

  if (planning && !plan) return <PlannerSkeleton />;

  if (!plan) {
    return (
      <EmptyState icon={CalendarPlus} title="Ready to build your week" text="We'll turn your prediction into 45–90 minute focus sessions, with the riskiest subjects first.">
        <button type="button" onClick={generate} disabled={planning} className="btn-primary">
          {planning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <CalendarPlus className="h-4 w-4" /> Generate my plan
            </>
          )}
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-medium text-slate-900 dark:text-white">Weekly planner</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Focus blocks, spaced reviews, and a timer for the next session.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {missed > 0 && (
            <button type="button" className="btn-ghost" onClick={catchUp}>
              Reschedule {missed} missed
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={downloadCalendar}>
            <CalendarDays className="h-4 w-4" /> Calendar
          </button>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>
      <StudyHero prediction={prediction} plan={plan} stats={stats} onRecalculate={generate} recalculating={planning} />
      <FocusTimer session={upcoming} onComplete={() => upcoming && toggleTask(upcoming.id)} />
      {planning ? <PlannerSkeleton /> : <PlanGrid plan={plan} subjects={prediction.subjects} done={done} onToggle={toggleTask} />}
      <StudySuggestions prediction={prediction} />
      <PrintablePlan prediction={prediction} plan={plan} />
    </div>
  );
}
