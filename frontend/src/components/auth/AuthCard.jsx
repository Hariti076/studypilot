import { GraduationCap, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const POINTS = [
  ['Predict', 'A score for every subject, with a range instead of a false certainty.'],
  ['Understand', 'Risk and a study persona, plus the habits that moved the score.'],
  ['Plan', 'A week of short sessions, spaced reviews, and the weakest topic first.'],
];

/** Centered card shell shared by the Login and Signup pages. */
export default function AuthCard({ title, subtitle, children, footer }) {
  const { dark, toggle } = useTheme();
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-sm text-indigo-200">
            <GraduationCap className="h-4 w-4" /> StudyPilot
          </span>
          <h2 className="mt-8 max-w-md text-5xl font-medium leading-[1.05]">Study time, aimed at the subjects that need it.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">Three trained models score the week. The planner turns that into sessions you can finish.</p>
        </div>
        <ol className="relative space-y-5">
          {POINTS.map(([label, text], index) => (
            <li key={label} className="flex gap-4">
              <span className="font-display text-2xl text-amber-200">{index + 1}</span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-sm text-slate-400">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="relative grid place-items-center px-4 py-10">
        <button type="button" aria-label="Toggle dark mode" onClick={toggle} className="icon-btn absolute right-4 top-4">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 lg:hidden">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-4xl font-medium text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="card !p-6 sm:!p-8">{children}</div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        </div>
      </div>
    </div>
  );
}
