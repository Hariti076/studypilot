import { CheckCircle2, Clock, ListTodo, Percent, RotateCcw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProgressBar from '../ui/ProgressBar';
import { useChartColors } from '../../hooks/useChartColors';
import { todayName } from '../../utils/helpers';

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default function ProgressOverview({ stats, day, onReset }) {
  const c = useChartColors();
  const today = todayName();
  const dayStat = stats.byDay.find((d) => d.day === day) || stats.today;
  const hoursDone = Math.round((stats.minutesDone / 60) * 10) / 10;
  const hoursTotal = Math.round((stats.minutesTotal / 60) * 10) / 10;
  const chartData = stats.byDay.map((d) => ({ name: d.day.slice(0, 3), Completed: d.completed, Pending: d.total - d.completed }));

  return (
    <section className="card" aria-labelledby="progress-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="progress-title" className="text-base font-semibold text-slate-900 dark:text-white">
          Progress overview
        </h2>
        <button type="button" onClick={onReset} className="btn-ghost !px-3 !py-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 flex items-end justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{day === today ? 'Today' : day}</span>
            <span className="text-slate-500 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">{dayStat.pct}%</strong> · {dayStat.completed}/{dayStat.total} sessions
            </span>
          </div>
          <ProgressBar value={dayStat.pct} color="bg-indigo-500" height="h-3" label="Daily progress" />
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">This week</span>
            <span className="text-slate-500 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">{stats.pct}%</strong> · {stats.completed}/{stats.total} sessions
            </span>
          </div>
          <ProgressBar value={stats.pct} color="bg-emerald-500" height="h-3" label="Weekly progress" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Clock} label={`Hours studied (of ${hoursTotal}h)`} value={`${hoursDone}h`} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" />
        <Metric icon={CheckCircle2} label="Tasks completed" value={stats.completed} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
        <Metric icon={ListTodo} label="Tasks pending" value={stats.remaining} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" />
        <Metric icon={Percent} label="Completion rate" value={`${stats.pct}%`} tone="bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300" />
      </div>

      <h3 className="mb-2 mt-7 text-sm font-semibold text-slate-900 dark:text-white">Completed vs pending, by day</h3>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
            <Tooltip cursor={{ fill: c.cursor }} contentStyle={c.tooltip} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.axis }} />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" maxBarSize={32} />
            <Bar dataKey="Pending" stackId="a" fill={c.muted} radius={[8, 8, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
