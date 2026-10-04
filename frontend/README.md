# StudyPilot — AI-Integrated Personalized Study Planner

Accounts, routing, dashboard, weekly planner, and progress tracker, with scores coming from the trained models on the FastAPI service.

**Stack:** React 18 · Vite · React Router 6 · Tailwind CSS · Recharts · Lucide React · Context API (no extra state library)

## Run it

Use two terminals.

```bash
# API — from the studypilot folder (the parent of this frontend)
pip install -r requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000

# App — from this folder
npm install
npm run dev        # http://localhost:5173
```

Requires Node 18+ and Python 3.11+. Create an account on the signup page (stored in this browser), then use **Fill sample data** on the inputs page. Analyse runs the trained models; the planner page turns that prediction into the week.

## Routes

| Route | Access | What it is |
| --- | --- | --- |
| `/login`, `/signup` | logged-out only | Auth pages (logged-in users are redirected to the dashboard) |
| `/dashboard` | protected | Summary cards, insights, charts, quick actions |
| `/planner` | protected | Weekly grid of study sessions, completion toggles, PDF export |
| `/progress` | protected | Daily/weekly progress, streak, analytics, checklist |
| `/inputs` | protected | Study details form ("Update inputs") |

Visiting a protected page while logged out redirects to `/login` and returns you to the page afterwards.

## Folder structure

```
src/
├── components/
│   ├── auth/        AuthCard, AuthForm
│   ├── dashboard/   SummaryCards, Insights, Charts, QuickActions
│   ├── inputs/      InputsForm
│   ├── layout/      AppLayout, Navbar, MobileNav, Reminders, RouteGuards, navItems
│   ├── planner/     PlanGrid, TaskCard, PrintablePlan
│   ├── progress/    ProgressOverview, DayChecklist, StreakCard
│   └── ui/          ProgressBar, Skeleton (+ page skeletons), EmptyState
├── context/         AuthContext, StudyContext, ThemeContext, ToastContext
├── hooks/           useAuth, useStudy, useTheme, useToast, useReminders,
│                    useGeneratePlan, useChartColors, useLocalStorage
├── pages/           Login, Signup, Dashboard, Planner, Progress, Inputs, NotFound
├── services/
│   ├── api.js       loginUser, signupUser, predictStudent, generatePlan
│   ├── http.js      fetch wrapper, ApiError, timeout, 401 handling
│   ├── session.js   token/user persistence
│   └── mock/        auth.js (browser accounts), sampleData.js
└── utils/           helpers.js (dates, stats, streaks, style maps), validators.js
```

## State management

Three small contexts replace prop drilling:

- **AuthContext** — `user`, `isAuthenticated`, `login`, `signup`, `logout`. The session lives in `localStorage` (`sp:session`) and is kept in sync across tabs. If the API ever returns 401, the user is signed out automatically.
- **StudyContext** — per-user `profile`, `prediction`, `plan`, task `done` map, derived `stats` and `streak`, plus `submitInputs`, `createPlan`, `toggleTask`, `resetProgress`. Data is stored per account (`sp:data:<userId>`), and the provider is keyed by user id so one account's data can never appear in another's.
- **ThemeContext / ToastContext** — dark mode and toast notifications.

Pages read state through hooks (`useAuth()`, `useStudy()`, …) and never call the API directly.

## API layer

All network access goes through `src/services/api.js`. Login and signup stay in the browser. `predictStudent` and `generatePlan` call the FastAPI service (`/api/predict` and `/api/plan`), which Vite proxies to port 8000.

| Function | Request | Response |
| --- | --- | --- |
| `loginUser` | `POST /auth/login` `{ email, password }` | `{ token, user: { id, name, email } }` |
| `signupUser` | `POST /auth/signup` `{ name, email, password }` | `{ token, user: { id, name, email } }` |
| `predictStudent` | `POST /api/predict` profile, including learning context | prediction (below) |
| `generatePlan` | `POST /api/plan` `{ profile, prediction }` | `{ plan: [...], generatedAt }` |

Authenticated calls send `Authorization: Bearer <token>`. Errors should return `{ "message": "..." }` — it is shown to the user as-is. Network failures, timeouts and non-JSON errors are turned into friendly messages by `http.js`.

**Prediction shape** (the dashboard reads these fields; persona names come from the K-means model):

```json
{
  "generatedAt": "2026-10-04T10:00:00Z",
  "risk": "High | Medium | Low",
  "predicted_scores": { "Math": 65, "Physics": 55 },
  "subjects": [{ "name": "Math", "examDate": "2026-10-16", "daysLeft": 12, "difficulty": 4,
                 "current": 62, "predicted": 65, "risk": "Medium",
                 "priority": "High | Medium | Low", "priorityScore": 51.8, "colorIdx": 0 }],
  "profile": { "dailyHours": 3, "sleepHours": 6, "habits": "Medium" },
  "trend": [{ "hours": 1, "score": 69 }, { "hours": 2, "score": 71 }],
  "persona": { "id": "steady", "name": "Steady Climber", "icon": "rocket",
               "description": "…", "tip": "…" },
  "feedback": [{ "type": "danger | warning | success | info", "text": "…" }],
  "summary": { "avgPredicted": 73, "avgCurrent": 68 }
}
```

`persona.icon` is one of `trophy | hourglass | flame | sprout | rocket`. Plan items: `{ id, day, subject, task, time, minutes, duration, type: "study" | "break", priority }`.

> **Security note:** the mock auth stores accounts and a salted SHA-256 password hash in the browser purely for demo purposes. A real backend must hash passwords server-side (bcrypt/argon2), issue real tokens and validate them on every request.

## UX details

- Skeleton loaders while pages load and while a plan generates; empty states with a clear next action on every page.
- Toast notifications for success/error/reminders; inline validation on every form.
- Dark mode (remembers your choice), responsive from phone to desktop (bottom tab bar on mobile).
- Pages are code-split with `React.lazy`.
- Export PDF uses the browser's print dialog (choose "Save as PDF").
- Daily reminders fire while the tab is open (optional browser notifications).
