import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

/** Countdown for the next unfinished session. The length comes from that session. */
export default function FocusTimer({ session, onComplete }) {
  const seconds = Math.max(1, (session?.minutes || 25) * 60);
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [session?.id, seconds]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  if (!session) return null;
  const minutes = String(Math.floor(left / 60)).padStart(2, '0');
  const secs = String(left % 60).padStart(2, '0');

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-black">Focus timer</h3>
        <p className="mt-1 truncate text-xs text-slate-300">
          Next up: {session.subject} · {session.task}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-black tabular-nums">
          {minutes}:{secs}
        </p>
        <button type="button" className="btn-primary" onClick={() => setRunning((value) => !value)} disabled={left === 0}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => { setRunning(false); setLeft(seconds); }} aria-label="Reset timer">
          <RotateCcw className="h-4 w-4" />
        </button>
        {left === 0 && (
          <button type="button" className="btn-ghost" onClick={onComplete}>
            Mark done
          </button>
        )}
      </div>
    </section>
  );
}
