export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ---------------- Dates & time ---------------- */
export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

function clockToMinutes(label) {
  const match = String(label).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 17 * 60;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return hour * 60 + Number(match[2]);
}

function sessionDate(dayName, planStart) {
  const anchor = new Date(`${planStart || todayISO()}T00:00:00`);
  const anchorIdx = (anchor.getDay() + 6) % 7;
  const date = new Date(anchor);
  date.setDate(anchor.getDate() + (DAYS.indexOf(dayName) - anchorIdx));
  return date;
}

function isMissed(item, done, planStart) {
  if (item.type !== 'study' || done[item.id]) return false;
  const when = sessionDate(item.day, planStart);
  const start = new Date(`${planStart || todayISO()}T00:00:00`);
  const today = new Date(`${todayISO()}T00:00:00`);
  return when >= start && when < today;
}

/** Move unfinished sessions from earlier weekdays onto today and the days still ahead. */
export function shiftMissedSessions(plan, done, planStart) {
  if (!plan?.length) return null;
  const todayIdx = DAYS.indexOf(todayName());
  const missed = plan.filter((item) => isMissed(item, done, planStart));
  if (!missed.length) return null;

  const staying = plan.filter((item) => !missed.includes(item));
  const byDay = Object.fromEntries(DAYS.map((day) => [day, staying.filter((item) => item.day === day)]));

  missed.forEach((item, index) => {
    const day = DAYS[Math.min(DAYS.length - 1, todayIdx + Math.floor(index / 3))];
    const blocks = byDay[day];
    const end = blocks.reduce((max, block) => Math.max(max, (block.start ?? clockToMinutes(block.time)) + block.minutes), 17 * 60);
    const start = Math.min(end + 10, 22 * 60 - item.minutes);
    blocks.push({
      ...item,
      day,
      start,
      time: `${formatClock(start)} – ${formatClock(start + item.minutes)}`,
      task: item.task.startsWith('Carried over') ? item.task : `Carried over — ${item.task}`,
      carried: true,
    });
  });

  const next = [];
  for (const day of DAYS) {
    const blocks = byDay[day].slice().sort((a, b) => (a.start ?? clockToMinutes(a.time)) - (b.start ?? clockToMinutes(b.time)));
    next.push(...blocks);
  }
  return next;
}

function nextWeekday(dayName) {
  const target = DAYS.indexOf(dayName);
  const date = new Date();
  const current = (date.getDay() + 6) % 7;
  const delta = (target - current + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function icsStamp(date, totalMinutes) {
  const copy = new Date(date);
  copy.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${copy.getFullYear()}${pad(copy.getMonth() + 1)}${pad(copy.getDate())}T${pad(copy.getHours())}${pad(copy.getMinutes())}00`;
}

/** Downloadable calendar for the study blocks in the current week. */
export function planToIcs(plan) {
  const events = plan
    .filter((item) => item.type === 'study')
    .map((item) => {
      const day = nextWeekday(item.day);
      const start = item.start ?? clockToMinutes(item.time);
      return [
        'BEGIN:VEVENT',
        `DTSTART:${icsStamp(day, start)}`,
        `DTEND:${icsStamp(day, start + item.minutes)}`,
        `SUMMARY:${item.subject} — ${item.task}`,
        'END:VEVENT',
      ].join('\r\n');
    });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyPilot//Weekly Plan//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}

/** After two finished sessions in a subject, the remaining blocks get a slightly longer stretch task. */
export function applyStretch(plan, done) {
  if (!plan?.length) return null;
  const counts = {};
  for (const item of plan) {
    if (item.type === 'study' && done[item.id]) counts[item.subject] = (counts[item.subject] || 0) + 1;
  }
  let changed = false;
  const next = plan.map((item) => {
    if (item.type !== 'study') return item;
    const ready = (counts[item.subject] || 0) >= 2 && !done[item.id];
    if (ready && !item.stretched) {
      changed = true;
      const base = item.baseMinutes ?? item.minutes;
      const minutes = Math.min(120, base + 10);
      return {
        ...item,
        baseMinutes: base,
        minutes,
        duration: formatDuration(minutes),
        stretched: true,
        task: item.task.startsWith('Stretch — ') ? item.task : `Stretch — ${item.task}`,
      };
    }
    if (!ready && item.stretched) {
      changed = true;
      const minutes = item.baseMinutes ?? item.minutes;
      return {
        ...item,
        minutes,
        duration: formatDuration(minutes),
        stretched: false,
        task: item.task.replace(/^Stretch — /, ''),
      };
    }
    return item;
  });
  return changed ? next : null;
}

export function priorityReason(subject) {
  if (!subject) return '';
  if (subject.daysLeft <= 10) return 'Exam is close';
  if ((subject.current ?? 100) < 65) return 'Current mark needs the time';
  if ((subject.difficulty ?? 0) >= 4) return 'Marked as a hard subject';
  if (subject.priority === 'Low') return 'Can follow the urgent subjects';
  return 'Balanced against the rest of the week';
}

export const PERSONA_SCHEDULE = {
  'Low Motivation': 'Sessions stay short, about 25–45 minutes, so a low-motivation day still starts.',
  'Irregular Attender': 'Sessions are shorter and more frequent, with class coming before a long block.',
  'Tutoring-Supported': 'Sessions leave room to prepare questions and revise the same topic that day.',
  'Consistent Attender': 'Sessions can run longer, and later blocks turn into harder practice.',
};

export function focusLine(prediction) {
  const focus = [...(prediction?.subjects || [])].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];
  if (!focus) return 'Add a subject to see where the week should start.';
  return `Focus more on ${focus.name}. ${priorityReason(focus)}, and the projected mark is ${focus.predicted}%.`;
}

/** If the week is underway and little is done, shorten the lighter sessions still ahead. */
export function easeWhenBehind(plan, done, planStart) {
  if (!plan?.length || !planStart || plan.some((item) => item.eased)) return null;
  const study = plan.filter((item) => item.type === 'study');
  if (!study.length) return null;
  const doneCount = study.filter((item) => done[item.id]).length;
  const elapsed = Math.round((new Date(`${todayISO()}T00:00:00`) - new Date(`${planStart}T00:00:00`)) / 86400000);
  if (elapsed < 2 || doneCount / study.length >= 0.25) return null;
  let changed = false;
  const next = plan.map((item) => {
    if (item.type !== 'study' || done[item.id] || item.priority !== 'Low') return item;
    changed = true;
    const base = item.baseMinutes ?? item.minutes;
    const minutes = Math.max(25, base - 15);
    return {
      ...item,
      baseMinutes: base,
      minutes,
      duration: formatDuration(minutes),
      eased: true,
      task: item.task.startsWith('Catch-up — ') ? item.task : `Catch-up — ${item.task}`,
    };
  });
  return changed ? next : null;
}

export function guideMessage(prediction, stats, streak) {
  const focus = [...(prediction?.subjects || [])].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];
  const name = focus?.name || 'the first subject';
  if (stats?.pct === 100) return { tone: 'up', text: "You're improving. This week's sessions are done." };
  if (streak >= 3) return { tone: 'up', text: `You're improving. ${streak} days in a row.` };
  if (stats?.total > 0 && stats.pct < 25 && stats.completed === 0) return { tone: 'down', text: `Consistency is dropping. Focus more on ${name}.` };
  if (prediction?.risk === 'High') return { tone: 'warn', text: `Focus more on ${name}. That subject needs the first block.` };
  if (stats?.pct >= 50) return { tone: 'up', text: "You're improving. More than half the week is done." };
  return { tone: 'info', text: focusLine(prediction) };
}

export function missedSessionCount(plan, done, planStart) {
  if (!plan?.length) return 0;
  return plan.filter((item) => isMissed(item, done, planStart)).length;
}

export function daysUntil(iso) {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - start) / 86400000);
}

export function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatClock(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} hr ${m} min`;
}

export function countdownLabel(days) {
  if (days <= 0) return 'Exam today';
  if (days === 1) return 'Exam tomorrow';
  return `Exam in ${days} days`;
}

/* ---------------- Streak & gamification ---------------- */
export function calcStreak(dates) {
  const d = new Date();
  if (!dates.has(toISO(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dates.has(toISO(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function computeStats(plan, done, dayName) {
  const study = plan.filter((p) => p.type === 'study');
  const total = study.length;
  const completed = study.filter((p) => done[p.id]).length;
  const byDay = DAYS.map((day) => {
    const items = study.filter((p) => p.day === day);
    const c = items.filter((p) => done[p.id]).length;
    return { day, total: items.length, completed: c, pct: items.length ? Math.round((c / items.length) * 100) : 0 };
  });
  return {
    total,
    completed,
    remaining: total - completed,
    pct: total ? Math.round((completed / total) * 100) : 0,
    minutesDone: study.filter((p) => done[p.id]).reduce((a, p) => a + p.minutes, 0),
    minutesTotal: study.reduce((a, p) => a + p.minutes, 0),
    byDay,
    today: byDay.find((d) => d.day === dayName),
  };
}

export function getLevel(xp) {
  return { level: Math.floor(xp / 100) + 1, into: xp % 100 };
}

/* ---------------- Adaptive feedback ---------------- */
export function getAdaptiveMessages(result, stats, streak) {
  const msgs = [...result.feedback];
  if (stats.total > 0) {
    if (stats.pct === 100) {
      msgs.unshift({ type: 'success', text: 'Incredible — you completed every session this week. Rest up and recharge!' });
    } else if (streak >= 3) {
      msgs.unshift({ type: 'success', text: `Good consistency, keep going! You're on a ${streak}-day streak.` });
    } else if (stats.pct >= 50) {
      msgs.unshift({ type: 'success', text: "Good consistency, keep going! You're past the halfway mark for this week." });
    } else if (stats.completed === 0) {
      msgs.push({ type: 'info', text: 'Tick off your first session to start a streak — small steps count.' });
    }
  }
  return msgs.slice(0, 7);
}

/* ---------------- Style lookups (full class names so Tailwind can see them) ---------------- */
export const RISK_STYLES = {
  High: {
    label: 'High risk',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
    banner: 'border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10',
    iconWrap: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    text: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
    hex: '#ef4444',
  },
  Medium: {
    label: 'Medium risk',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    banner: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10',
    iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-400',
    hex: '#f59e0b',
  },
  Low: {
    label: 'Low risk',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    banner: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    hex: '#10b981',
  },
};

export const SUBJECT_COLORS = [
  { dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200' },
  { dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200' },
  { dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200' },
  { dot: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200' },
  { dot: 'bg-pink-500', soft: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-200' },
  { dot: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200' },
  { dot: 'bg-lime-500', soft: 'bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-200' },
  { dot: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200' },
];

/** Task-card styling by session priority (full class names so Tailwind can see them). */
export const PRIORITY_STYLES = {
  High: {
    card: 'border-l-4 border-l-red-500 border-y border-r border-red-200 bg-red-50/70 dark:border-red-500/30 dark:border-l-red-500 dark:bg-red-500/10',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  Medium: {
    card: 'border-l-4 border-l-amber-400 border-y border-r border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:border-l-amber-400 dark:bg-amber-500/10',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  Low: {
    card: 'border-l-4 border-l-emerald-400 border-y border-r border-slate-200 bg-white dark:border-slate-800 dark:border-l-emerald-400 dark:bg-slate-900',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
};
