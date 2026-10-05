import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePlan, predictStudent } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { applyStretch, calcStreak, computeStats, shiftMissedSessions, todayISO, todayName } from '../utils/helpers';

export const StudyContext = createContext(null);

const EMPTY = { profile: null, prediction: null, plan: null, planStart: null, done: {}, past: [], guideNote: '' };
const storageKey = (userId) => `sp:data:${userId}`;

function load(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Dates on which sessions were completed in earlier plans, so a new plan doesn't reset the streak. */
const archive = (d) => [...new Set([...d.past, ...Object.values(d.done)])];

/**
 * Per-user study data: inputs, ML prediction, generated plan and progress.
 * Mounted once per logged-in user (keyed by user id), so switching accounts never leaks data.
 */
export function StudyProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(() => load(user.id));
  const [predicting, setPredicting] = useState(false);
  const [planning, setPlanning] = useState(false);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(data));
    } catch {
      /* storage unavailable */
    }
  }, [data, user.id]);

  useEffect(() => {
    setData((current) => {
      const shifted = shiftMissedSessions(current.plan, current.done, current.planStart);
      if (!shifted) return current;
      return { ...current, plan: shifted, guideNote: 'Missed sessions moved onto the days still ahead.' };
    });
  }, [user.id]);

  /** Send the form to the model service. Replaces the prediction and invalidates the old plan. */
  const submitInputs = useCallback(async (profile) => {
    setPredicting(true);
    try {
      const prediction = await predictStudent(profile);
      setData((d) => ({ profile, prediction, plan: null, planStart: null, done: {}, past: archive(d) }));
      return prediction;
    } finally {
      setPredicting(false);
    }
  }, []);

  /** Generate a weekly plan from the stored profile + prediction. */
  const createPlan = useCallback(async () => {
    const { profile, prediction } = ref.current;
    if (!profile || !prediction) throw new Error('Enter your study details first.');
    setPlanning(true);
    try {
      const res = await generatePlan({ profile, prediction });
      setData((d) => ({ ...d, plan: res.plan, planStart: todayISO(), done: {}, past: archive(d) }));
      return res.plan;
    } finally {
      setPlanning(false);
    }
  }, []);

  const toggleTask = useCallback((id) => {
    setData((d) => {
      const done = { ...d.done };
      const finishing = !done[id];
      if (finishing) done[id] = todayISO();
      else delete done[id];
      const stretched = applyStretch(d.plan, done);
      return {
        ...d,
        done,
        plan: stretched || d.plan,
        guideNote: stretched && finishing ? 'Completed work raised the next sessions a step.' : d.guideNote,
      };
    });
  }, []);

  const resetProgress = useCallback(() => setData((d) => ({ ...d, done: {}, past: archive(d) })), []);

  const rescheduleMissed = useCallback(() => {
    const next = shiftMissedSessions(ref.current.plan, ref.current.done, ref.current.planStart);
    if (!next) return 0;
    const before = ref.current.plan.filter((item) => item.carried).length;
    setData((d) => ({ ...d, plan: next }));
    return next.filter((item) => item.carried).length - before || next.filter((item) => item.carried).length;
  }, []);

  const stats = useMemo(() => computeStats(data.plan ?? [], data.done, todayName()), [data.plan, data.done]);
  const streak = useMemo(() => calcStreak(new Set([...data.past, ...Object.values(data.done)])), [data.past, data.done]);

  const value = useMemo(
    () => ({
      profile: data.profile,
      prediction: data.prediction,
      plan: data.plan,
      planStart: data.planStart,
      done: data.done,
      guideNote: data.guideNote,
      stats,
      streak,
      predicting,
      planning,
      submitInputs,
      createPlan,
      toggleTask,
      resetProgress,
      rescheduleMissed,
    }),
    [data, stats, streak, predicting, planning, submitInputs, createPlan, toggleTask, resetProgress, rescheduleMissed]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}
