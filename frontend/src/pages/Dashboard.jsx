import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import ExplainFactors from '../components/dashboard/ExplainFactors';
import MlCard from '../components/dashboard/MlCard';
import Insights from '../components/dashboard/Insights';
import Charts from '../components/dashboard/Charts';
import TodayBoard from '../components/dashboard/TodayBoard';
import QuickActions from '../components/dashboard/QuickActions';
import StudyHero from '../components/planner/StudyHero';
import StudySuggestions from '../components/planner/StudySuggestions';
import SubjectRiskCards from '../components/planner/SubjectRiskCards';
import EmptyState from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useGeneratePlan } from '../hooks/useGeneratePlan';
import { useStudy } from '../hooks/useStudy';
import { getAdaptiveMessages } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const { prediction, plan, done, toggleTask, predicting, stats, streak } = useStudy();
  const { generate, planning } = useGeneratePlan({ navigateToPlanner: !plan });
  const messages = useMemo(() => (prediction ? getAdaptiveMessages(prediction, stats, streak) : []), [prediction, stats, streak]);

  if (predicting) return <DashboardSkeleton />;

  if (!prediction) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title={`Welcome, ${user.name.split(' ')[0]}!`}
        text="Tell us about your subjects and routine, and we'll predict your performance and build a plan around it."
      >
        <Link to="/inputs" className="btn-primary">
          Enter my study details
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Your study desk</p>
        <h1 className="mt-1 text-4xl font-medium text-slate-900 dark:text-white">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Prediction updated {new Date(prediction.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {prediction.subjects.length} {prediction.subjects.length === 1 ? 'subject' : 'subjects'}
        </p>
      </header>

      <StudyHero prediction={prediction} plan={plan} stats={stats} onRecalculate={generate} recalculating={planning} />
      {prediction.warnings?.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" role="status">
          {prediction.warnings.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      <MlCard prediction={prediction} />
      <TodayBoard plan={plan} done={done} onToggle={toggleTask} />
      <SubjectRiskCards subjects={prediction.subjects} plan={plan} weeklyBudget={prediction.profile.dailyHours * 7} />
      <StudySuggestions prediction={prediction} showPlanLink />
      <ExplainFactors explanation={prediction.explanation} />
      <Insights messages={messages} subjects={prediction.subjects} />
      <Charts prediction={prediction} />
      <QuickActions />
    </div>
  );
}
