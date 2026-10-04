import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '../../hooks/useChartColors';
import { RISK_STYLES } from '../../utils/helpers';

export default function Charts({ prediction }) {
  const c = useChartColors();
  const barData = prediction.subjects.map((s) => ({ name: s.name, predicted: s.predicted, current: s.current, risk: s.risk }));
  const userHours = prediction.profile.dailyHours;
  const userPoint = prediction.trend.find((t) => t.hours === userHours);
  const maxH = Math.max(...prediction.trend.map((t) => t.hours));
  const ticks = Array.from({ length: Math.ceil(maxH) }, (_, i) => i + 1);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card" aria-labelledby="bar-title">
        <h3 id="bar-title" className="text-base font-semibold text-slate-900 dark:text-white">
          Subject vs predicted score
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Coloured bars show prediction by risk; grey shows your current score.</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} interval={0} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
              <Tooltip cursor={{ fill: c.cursor }} contentStyle={c.tooltip} formatter={(v, n) => [`${v}%`, n]} />
              <Bar dataKey="current" name="Current" fill={c.muted} radius={[8, 8, 0, 0]} maxBarSize={28} />
              <Bar dataKey="predicted" name="Predicted" radius={[8, 8, 0, 0]} maxBarSize={28}>
                {barData.map((d) => (
                  <Cell key={d.name} fill={RISK_STYLES[d.risk].hex} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" aria-labelledby="line-title">
        <h3 id="line-title" className="text-base font-semibold text-slate-900 dark:text-white">
          Study hours vs performance
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Average predicted score if you studied this many hours a day.</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prediction.trend} margin={{ top: 16, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
              <XAxis
                dataKey="hours"
                type="number"
                domain={[1, maxH]}
                ticks={ticks}
                tickLine={false}
                axisLine={false}
                tick={{ fill: c.axis, fontSize: 12 }}
                tickFormatter={(v) => `${v}h`}
              />
              <YAxis
                domain={[(min) => Math.max(0, Math.floor(min / 5) * 5 - 5), (max) => Math.min(100, Math.ceil(max / 5) * 5 + 5)]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: c.axis, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={c.tooltip}
                formatter={(v) => [`${v}%`, 'Avg predicted score']}
                labelFormatter={(l) => `${l} h / day`}
              />
              <ReferenceLine
                y={70}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Safe zone', position: 'insideBottomRight', fill: '#10b981', fontSize: 11 }}
              />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              {userPoint && (
                <ReferenceDot
                  x={userPoint.hours}
                  y={userPoint.score}
                  r={7}
                  fill="#6366f1"
                  stroke={c.tooltip.background}
                  strokeWidth={3}
                  label={{ value: 'You', position: 'top', fill: c.axis, fontSize: 12 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <HoursExplorer trend={prediction.trend} currentHours={userHours} />
      </section>
    </div>
  );
}

function nearest(trend, hours) {
  return trend.reduce((best, point) => (Math.abs(point.hours - hours) < Math.abs(best.hours - hours) ? point : best));
}

/** Drag the daily hours to read the score the model already computed for that load. */
function HoursExplorer({ trend, currentHours }) {
  const max = Math.max(...trend.map((point) => point.hours));
  const [hours, setHours] = useState(currentHours);
  const chosen = nearest(trend, hours);
  const baseline = nearest(trend, currentHours);
  const delta = chosen.score - baseline.score;
  const sign = delta > 0 ? '+' : '';

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="hours-what-if" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          What if you studied {chosen.hours}h a day?
        </label>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Predicted average <span className="font-semibold text-slate-900 dark:text-white">{chosen.score}%</span>
          <span className={delta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
            {' '}
            {sign}
            {delta} vs your plan
          </span>
        </p>
      </div>
      <input
        id="hours-what-if"
        type="range"
        min={1}
        max={max}
        step={0.5}
        value={hours}
        onChange={(event) => setHours(Number(event.target.value))}
        className="mt-3 w-full accent-indigo-600"
      />
    </div>
  );
}
