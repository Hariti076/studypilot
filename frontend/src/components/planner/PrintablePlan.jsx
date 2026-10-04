import { createPortal } from 'react-dom';
import { DAYS, countdownLabel, formatDate } from '../../utils/helpers';

/** Plain, light-themed full-week plan rendered into <body>; the print stylesheet shows only this. */
export default function PrintablePlan({ prediction, plan }) {
  const { subjects, risk } = prediction;
  const generatedAt = prediction.generatedAt;

  return createPortal(
    <div id="print-root" className="font-sans text-slate-900">
      <h1 className="text-2xl font-bold">Weekly Study Plan</h1>
      <p className="mt-1 text-sm text-slate-600">
        Generated {new Date(generatedAt).toLocaleDateString()} · Overall risk: <strong>{risk}</strong>
      </p>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1 pr-2">Subject</th>
            <th className="py-1 pr-2">Exam</th>
            <th className="py-1 pr-2">Projected with plan</th>
            <th className="py-1">Priority</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.name} className="border-b border-slate-100">
              <td className="py-1 pr-2">{s.name}</td>
              <td className="py-1 pr-2">
                {formatDate(s.examDate)} ({countdownLabel(s.daysLeft)})
              </td>
              <td className="py-1 pr-2">
                {s.predicted}% ({s.risk} risk)
              </td>
              <td className="py-1">{s.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {DAYS.map((day) => {
        const items = plan.filter((p) => p.day === day);
        return (
          <section key={day} className="mt-5 break-inside-avoid">
            <h2 className="border-b border-slate-400 pb-1 text-sm font-semibold">{day}</h2>
            <table className="mt-1 w-full border-collapse text-xs">
              <tbody>
                {items.map((p) =>
                  p.type === 'break' ? (
                    <tr key={p.id} className="text-slate-500">
                      <td className="w-6 py-0.5" />
                      <td className="w-40 py-0.5">{p.time}</td>
                      <td className="py-0.5 italic" colSpan={3}>
                        {p.task} ({p.duration})
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="w-6 py-1">☐</td>
                      <td className="w-40 py-1">{p.time}</td>
                      <td className="w-36 py-1 font-medium">
                        {p.priority === 'High' ? '★ ' : ''}
                        {p.subject}
                      </td>
                      <td className="py-1">{p.task}</td>
                      <td className="w-20 py-1 text-right">{p.duration}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </section>
        );
      })}
      <p className="mt-6 text-xs text-slate-500">★ = high-priority subject · Sessions are 45–90 minutes with breaks in between.</p>
    </div>,
    document.body
  );
}
