import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Clock } from 'lucide-react';
import { useReminders } from '../../hooks/useReminders';

export default function Reminders() {
  const { reminder, setReminder, upcoming, sendTest } = useReminders();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const toggle = () => {
    const next = !reminder.enabled;
    setReminder((r) => ({ ...r, enabled: next }));
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" className="icon-btn relative" aria-label="Reminders" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {reminder.enabled ? <BellRing className="h-5 w-5 text-indigo-500" /> : <Bell className="h-5 w-5" />}
        {upcoming.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {upcoming.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Study reminders</h3>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">Daily reminder</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminder.enabled}
              onClick={toggle}
              className={`relative h-6 w-11 rounded-full transition ${reminder.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${reminder.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <label className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Remind me at
            </span>
            <input
              type="time"
              value={reminder.time}
              onChange={(e) => setReminder((r) => ({ ...r, time: e.target.value, lastFired: '' }))}
              className="input !w-auto !py-1.5"
            />
          </label>

          <button type="button" onClick={sendTest} className="btn-ghost mt-3 w-full">
            Send test reminder
          </button>
          <p className="mt-2 text-[11px] leading-snug text-slate-400">Reminders fire while this tab is open. Allow browser notifications for system alerts.</p>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Up next today</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing left today — enjoy your break.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-200">{p.subject}</span>
                    <span className="shrink-0 text-xs text-slate-400">{p.time.split(' – ')[0]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
