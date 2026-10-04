import { Flame, Sparkles, Target, Trophy } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import { getLevel } from '../../utils/helpers';

export default function StreakCard({ stats, streak }) {
  const xp = stats.completed * 10 + streak * 5;
  const { level, into } = getLevel(xp);
  const badges = [
    { id: 'first', label: 'First step', desc: 'Complete a session', icon: Sparkles, earned: stats.completed >= 1 },
    { id: 'half', label: 'Halfway there', desc: '50% of the week', icon: Target, earned: stats.pct >= 50 },
    { id: 'streak', label: 'On fire', desc: '3-day streak', icon: Flame, earned: streak >= 3 },
    { id: 'perfect', label: 'Perfect week', desc: 'Finish every session', icon: Trophy, earned: stats.total > 0 && stats.pct === 100 },
  ];

  return (
    <>
      <section className="card overflow-hidden !p-0" aria-label="Streak">
        <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
              <Flame className="h-7 w-7" />
            </span>
            <div>
              <p className="text-3xl font-bold leading-none">{streak}</p>
              <p className="text-sm text-white/90">day{streak === 1 ? '' : 's'} streak</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/90">{streak === 0 ? 'Complete a session today to start your streak.' : 'Complete a session every day to keep it alive.'}</p>
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">Level {level}</span>
            <span className="text-slate-500 dark:text-slate-400">{xp} XP</span>
          </div>
          <ProgressBar value={into} color="bg-violet-500" label="Level progress" />
          <p className="mt-2 text-xs text-slate-400">
            {100 - into} XP to level {level + 1} · +10 XP per session
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">Badges</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {badges.map(({ id, label, desc, icon: Icon, earned }) => (
            <li
              key={id}
              className={`rounded-xl border p-3 text-center transition ${
                earned ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
              }`}
            >
              <Icon className={`mx-auto h-6 w-6 ${earned ? 'text-amber-500' : 'text-slate-400'}`} />
              <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
