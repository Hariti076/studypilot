import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useStudy } from './useStudy';
import { useToast } from './useToast';
import { pad, todayISO, todayName } from '../utils/helpers';

/** Daily study reminder: in-app toast (+ browser notification if allowed). Fires while the tab is open. */
export function useReminders() {
  const { plan, done } = useStudy();
  const toast = useToast();
  const [reminder, setReminder] = useLocalStorage('sp:reminder', { enabled: false, time: '18:00', lastFired: '' });

  const upcoming = useMemo(
    () => (plan ? plan.filter((p) => p.type === 'study' && p.day === todayName() && !done[p.id]) : []),
    [plan, done]
  );

  const notify = useCallback(
    (message) => {
      toast.reminder(message);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('StudyPilot', { body: message });
        } catch {
          /* some browsers block constructor notifications */
        }
      }
    },
    [toast]
  );

  const latest = useRef({});
  latest.current = { reminder, upcoming, notify };
  useEffect(() => {
    const id = setInterval(() => {
      const { reminder: r, upcoming: u, notify: n } = latest.current;
      if (!r.enabled) return;
      const now = new Date();
      if (`${pad(now.getHours())}:${pad(now.getMinutes())}` === r.time && r.lastFired !== todayISO()) {
        setReminder((prev) => ({ ...prev, lastFired: todayISO() }));
        n(
          u.length
            ? `Time to study! ${u.length} session${u.length === 1 ? '' : 's'} left today — next up: ${u[0].subject}.`
            : "You've finished today's sessions. Great job!"
        );
      }
    }, 20000);
    return () => clearInterval(id);
  }, [setReminder]);

  const sendTest = useCallback(() => notify('This is how your study reminder will look. Time to focus!'), [notify]);
  return { reminder, setReminder, upcoming, sendTest };
}
