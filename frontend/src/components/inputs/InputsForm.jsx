import { useEffect, useState } from 'react';
import { BookOpen, Brain, GraduationCap, Loader2, Moon, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { todayISO } from '../../utils/helpers';
import { sampleProfile } from '../../services/mock/sampleData';

const uid = () => Math.random().toString(36).slice(2, 9);
const blankSubject = () => ({ id: uid(), name: '', examDate: '', score: '', difficulty: 3, weakTopic: '' });
const DIFFICULTY_LABELS = ['Very easy', 'Easy', 'Moderate', 'Hard', 'Very hard'];
const MAX_SUBJECTS = 8;
const LEVELS = ['Low', 'Medium', 'High'];

const CONTEXT_DEFAULTS = {
  attendance: '80',
  parentalInvolvement: 'Medium',
  accessToResources: 'Medium',
  extracurricular: 'No',
  internetAccess: 'Yes',
  tutoringSessions: '1',
  teacherQuality: 'Medium',
  peerInfluence: 'Neutral',
  physicalActivity: '3',
};

function toFormState(p) {
  const context = {
    attendance: p?.attendance == null ? CONTEXT_DEFAULTS.attendance : String(p.attendance),
    parentalInvolvement: p?.parentalInvolvement || CONTEXT_DEFAULTS.parentalInvolvement,
    accessToResources: p?.accessToResources || CONTEXT_DEFAULTS.accessToResources,
    extracurricular: p?.extracurricular || CONTEXT_DEFAULTS.extracurricular,
    internetAccess: p?.internetAccess || CONTEXT_DEFAULTS.internetAccess,
    tutoringSessions: p?.tutoringSessions == null ? CONTEXT_DEFAULTS.tutoringSessions : String(p.tutoringSessions),
    teacherQuality: p?.teacherQuality || CONTEXT_DEFAULTS.teacherQuality,
    peerInfluence: p?.peerInfluence || CONTEXT_DEFAULTS.peerInfluence,
    physicalActivity: p?.physicalActivity == null ? CONTEXT_DEFAULTS.physicalActivity : String(p.physicalActivity),
  };
  if (!p) return { subjects: [blankSubject()], dailyHours: '', sleepHours: '', habits: '', peakEnergy: 'Evening', ...context };
  return {
    subjects: p.subjects.map((s) => ({ id: uid(), name: s.name, examDate: s.examDate, score: String(s.score), difficulty: s.difficulty, weakTopic: s.weakTopic || '' })),
    dailyHours: String(p.dailyHours),
    sleepHours: String(p.sleepHours),
    peakEnergy: p.peakEnergy || 'Evening',
    habits: p.habits,
    ...context,
  };
}

function validate(f) {
  const e = { subjects: {} };
  const seen = new Set();
  f.subjects.forEach((s) => {
    const se = {};
    const name = s.name.trim();
    if (!name) se.name = 'Enter a subject name';
    else if (seen.has(name.toLowerCase())) se.name = 'Duplicate subject name';
    else seen.add(name.toLowerCase());

    if (!s.examDate) se.examDate = 'Pick an exam date';
    else if (s.examDate < todayISO()) se.examDate = 'Date is in the past';

    if (s.score === '' || Number.isNaN(Number(s.score))) se.score = 'Enter your current %';
    else if (Number(s.score) < 0 || Number(s.score) > 100) se.score = 'Must be 0–100';

    if (!s.difficulty) se.difficulty = 'Rate the difficulty';
    if (Object.keys(se).length) e.subjects[s.id] = se;
  });

  if (f.dailyHours === '' || Number.isNaN(Number(f.dailyHours))) e.dailyHours = 'Enter your daily study hours';
  else if (Number(f.dailyHours) < 1 || Number(f.dailyHours) > 12) e.dailyHours = 'Choose between 1 and 12 hours';

  if (f.sleepHours === '' || Number.isNaN(Number(f.sleepHours))) e.sleepHours = 'Enter your sleep hours';
  else if (Number(f.sleepHours) < 3 || Number(f.sleepHours) > 12) e.sleepHours = 'Choose between 3 and 12 hours';

  if (!f.habits) e.habits = 'Select your study-habit level';

  if (f.attendance === '' || Number.isNaN(Number(f.attendance))) e.attendance = 'Enter your attendance';
  else if (Number(f.attendance) < 60 || Number(f.attendance) > 100) e.attendance = 'Choose between 60 and 100';

  if (f.tutoringSessions === '' || Number.isNaN(Number(f.tutoringSessions))) e.tutoringSessions = 'Enter tutoring sessions';
  else if (Number(f.tutoringSessions) < 0 || Number(f.tutoringSessions) > 8) e.tutoringSessions = 'Choose between 0 and 8';

  if (f.physicalActivity === '' || Number.isNaN(Number(f.physicalActivity))) e.physicalActivity = 'Enter physical activity';
  else if (Number(f.physicalActivity) < 0 || Number(f.physicalActivity) > 6) e.physicalActivity = 'Choose between 0 and 6';

  if (!LEVELS.includes(f.parentalInvolvement)) e.parentalInvolvement = 'Select parental involvement';
  if (!LEVELS.includes(f.accessToResources)) e.accessToResources = 'Select access to resources';
  if (!LEVELS.includes(f.teacherQuality)) e.teacherQuality = 'Select teacher quality';
  if (!['Yes', 'No'].includes(f.extracurricular)) e.extracurricular = 'Select yes or no';
  if (!['Yes', 'No'].includes(f.internetAccess)) e.internetAccess = 'Select yes or no';
  if (!['Negative', 'Neutral', 'Positive'].includes(f.peerInfluence)) e.peerInfluence = 'Select peer influence';
  return e;
}

const hasErrors = (e) => Object.keys(e.subjects).length > 0 || Object.keys(e).some((k) => k !== 'subjects');

function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-500">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

function DifficultyPicker({ value, onChange }) {
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Difficulty rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`h-10 flex-1 rounded-xl border text-sm font-semibold transition ${
              value === n
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:bg-slate-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{DIFFICULTY_LABELS[value - 1]}</p>
    </div>
  );
}

export default function InputsForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(() => toFormState(initial));
  const [errors, setErrors] = useState({ subjects: {} });
  const [submitted, setSubmitted] = useState(false);

  // After the first submit attempt, re-validate live so errors clear as the user fixes them.
  useEffect(() => {
    if (submitted) setErrors(validate(form));
  }, [form, submitted]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updateSubject = (id, patch) => setForm((f) => ({ ...f, subjects: f.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const addSubject = () => setForm((f) => (f.subjects.length >= MAX_SUBJECTS ? f : { ...f, subjects: [...f.subjects, blankSubject()] }));
  const removeSubject = (id) => setForm((f) => ({ ...f, subjects: f.subjects.filter((s) => s.id !== id) }));
  const fillSample = () => {
    setForm(toFormState(sampleProfile()));
    setErrors({ subjects: {} });
    setSubmitted(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setSubmitted(true);
    if (hasErrors(errs)) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    onSubmit({
      subjects: form.subjects.map((s) => ({ name: s.name.trim(), examDate: s.examDate, score: Number(s.score), difficulty: s.difficulty, weakTopic: (s.weakTopic || '').trim() })),
      dailyHours: Number(form.dailyHours),
      sleepHours: Number(form.sleepHours),
      habits: form.habits,
      peakEnergy: form.peakEnergy || 'Evening',
      attendance: Number(form.attendance),
      parentalInvolvement: form.parentalInvolvement,
      accessToResources: form.accessToResources,
      extracurricular: form.extracurricular,
      internetAccess: form.internetAccess,
      tutoringSessions: Number(form.tutoringSessions),
      teacherQuality: form.teacherQuality,
      peerInfluence: form.peerInfluence,
      physicalActivity: Number(form.physicalActivity),
    });
  };

  const cls = (err) => `input ${err ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Subjects */}
      <section className="card animate-fade-up">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your subjects</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Add each subject with its exam date and how hard it feels.</p>
            </div>
          </div>
          <button type="button" onClick={fillSample} className="btn-ghost">
            <Wand2 className="h-4 w-4" /> Fill sample data
          </button>
        </div>

        <div className="space-y-4">
          {form.subjects.map((s, i) => {
            const se = errors.subjects?.[s.id] || {};
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subject {i + 1}</span>
                  {form.subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(s.id)}
                      aria-label={`Remove subject ${i + 1}`}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_.8fr]">
                  <Field label="Subject name" error={se.name}>
                    <input
                      className={cls(se.name)}
                      aria-invalid={!!se.name}
                      placeholder="e.g. Mathematics"
                      value={s.name}
                      onChange={(e) => updateSubject(s.id, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="Exam date" error={se.examDate}>
                    <input
                      type="date"
                      min={todayISO()}
                      className={cls(se.examDate)}
                      aria-invalid={!!se.examDate}
                      value={s.examDate}
                      onChange={(e) => updateSubject(s.id, { examDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Current score (%)" error={se.score}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      className={cls(se.score)}
                      aria-invalid={!!se.score}
                      placeholder="0–100"
                      value={s.score}
                      onChange={(e) => updateSubject(s.id, { score: e.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="label">Difficulty (1 easy – 5 hard)</span>
                    <DifficultyPicker value={s.difficulty} onChange={(n) => updateSubject(s.id, { difficulty: n })} />
                  </div>
                  <Field label="Weak topic (optional)" hint="The first session for this subject starts here">
                    <input
                      className="input"
                      placeholder="e.g. numericals"
                      value={s.weakTopic || ''}
                      onChange={(e) => updateSubject(s.id, { weakTopic: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addSubject}
          disabled={form.subjects.length >= MAX_SUBJECTS}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
        >
          <Plus className="h-4 w-4" /> Add another subject
        </button>
      </section>

      {/* Routine */}
      <section className="card animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <Moon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Daily routine</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Time, sleep and habits shape your predicted results.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Study hours / day" error={errors.dailyHours} hint="The score model treats this as weekly hours × 7">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="1"
              max="12"
              className={cls(errors.dailyHours)}
              aria-invalid={!!errors.dailyHours}
              placeholder="e.g. 3"
              value={form.dailyHours}
              onChange={(e) => update({ dailyHours: e.target.value })}
            />
          </Field>
          <Field label="Sleep hours / night" error={errors.sleepHours} hint="Most students need 7–9">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="3"
              max="12"
              className={cls(errors.sleepHours)}
              aria-invalid={!!errors.sleepHours}
              placeholder="e.g. 7"
              value={form.sleepHours}
              onChange={(e) => update({ sleepHours: e.target.value })}
            />
          </Field>
          <Field label="Study habits" error={errors.habits} hint="Sent to the models as motivation level">
            <select
              className={cls(errors.habits)}
              aria-invalid={!!errors.habits}
              value={form.habits}
              onChange={(e) => update({ habits: e.target.value })}
            >
              <option value="">Select…</option>
              <option value="Low">Low — I study in bursts</option>
              <option value="Medium">Medium — fairly regular</option>
              <option value="High">High — very consistent</option>
            </select>
          </Field>
          <Field label="Best focus time" hint="The planner starts the hardest subject then. This is not a model input.">
            <select className="input" value={form.peakEnergy || 'Evening'} onChange={(e) => update({ peakEnergy: e.target.value })}>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card animate-fade-up" style={{ animationDelay: '140ms' }}>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Learning context</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              These are the other inputs the trained score, risk, and persona models use.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Attendance (%)" error={errors.attendance} hint="60–100">
            <input
              type="number"
              inputMode="decimal"
              min="60"
              max="100"
              className={cls(errors.attendance)}
              aria-invalid={!!errors.attendance}
              value={form.attendance}
              onChange={(e) => update({ attendance: e.target.value })}
            />
          </Field>
          <Field label="Tutoring sessions" error={errors.tutoringSessions} hint="0–8 in a typical month">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="8"
              step="1"
              className={cls(errors.tutoringSessions)}
              aria-invalid={!!errors.tutoringSessions}
              value={form.tutoringSessions}
              onChange={(e) => update({ tutoringSessions: e.target.value })}
            />
          </Field>
          <Field label="Physical activity" error={errors.physicalActivity} hint="Hours in a typical week, 0–6">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="6"
              step="1"
              className={cls(errors.physicalActivity)}
              aria-invalid={!!errors.physicalActivity}
              value={form.physicalActivity}
              onChange={(e) => update({ physicalActivity: e.target.value })}
            />
          </Field>
          <Field label="Parental involvement" error={errors.parentalInvolvement}>
            <select className={cls(errors.parentalInvolvement)} value={form.parentalInvolvement} onChange={(e) => update({ parentalInvolvement: e.target.value })}>
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </Field>
          <Field label="Access to resources" error={errors.accessToResources}>
            <select className={cls(errors.accessToResources)} value={form.accessToResources} onChange={(e) => update({ accessToResources: e.target.value })}>
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </Field>
          <Field label="Teacher quality" error={errors.teacherQuality}>
            <select className={cls(errors.teacherQuality)} value={form.teacherQuality} onChange={(e) => update({ teacherQuality: e.target.value })}>
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </Field>
          <Field label="Peer influence" error={errors.peerInfluence}>
            <select className={cls(errors.peerInfluence)} value={form.peerInfluence} onChange={(e) => update({ peerInfluence: e.target.value })}>
              {['Negative', 'Neutral', 'Positive'].map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </Field>
          <Field label="Extracurricular activities" error={errors.extracurricular}>
            <select className={cls(errors.extracurricular)} value={form.extracurricular} onChange={(e) => update({ extracurricular: e.target.value })}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </Field>
          <Field label="Internet access" error={errors.internetAccess}>
            <select className={cls(errors.internetAccess)} value={form.internetAccess} onChange={(e) => update({ internetAccess: e.target.value })}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </Field>
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Brain className="h-4 w-4 shrink-0" /> Scores and the weekly plan are produced by the local model API.
        </p>
        <button type="submit" disabled={loading} className="btn-primary sm:min-w-[220px]">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Analyse my performance
            </>
          )}
        </button>
      </div>
    </form>
  );
}
