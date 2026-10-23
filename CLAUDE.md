# CLAUDE.md — RepRadar project guide

This file tells Claude Code how this project is built and how to work on it.
Read it fully at the start of every session.

## Project

RepRadar is a MERN web app (bootcamp capstone) that helps gym-goers log workouts,
see which muscle groups they've neglected, get rule-based exercise recommendations,
and build streaks through location-verified gym check-ins.
The approved proposal is the source of truth for scope: seven MVP features, no stretch goals
until the MVP is finished, tested and deployed.

The marking rubric scores six areas equally: architecture, code quality and documentation,
framework usage, testing, devlog, and deployment. Quality matters more than feature count.

## How to work with me (the student)

I'm an entry-level developer who will manage apps in the future. I need to understand
and navigate this codebase, not just have it built.

- **Explain before applying.** Before each change, say in 2–4 sentences what you're changing,
  which layer it belongs to, and why. Keep explanations short and plain.
- **Small steps.** One logical change at a time, then run tests and lint.
- **Commit after each logical step** using conventional commits:
  `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`.
  Lots of small, meaningful commits are expected by the instructor.
- **One branch per feature** (e.g. `feature/exercise-library`). Merge to `main` only through
  a pull request with green CI. Notes and docs may be pushed straight to `main`.
- **PR descriptions** use three sections: What's included / How to test / Notes.
- **Keep `ARCHITECTURE.md` updated** whenever a new layer, folder or pattern appears.
- **Log debugging stories** in `notes/week-3.md` (symptom, hypothesis, test, fix). These feed
  the weekly devlog, which must describe my troubleshooting thought process.
- If something is ambiguous or would change the approved scope, ask me first.

## Documentation duties

Keep `ARCHITECTURE.md`, `DEVLOG.md` and the notes up to date as part of the work, not as an afterthought.

**ARCHITECTURE.md** (update before opening each feature's pull request):
- Add new folders, files, layers or patterns to the folder map.
- Add a short request-flow example for each new resource (e.g. logging a workout:
  route → validator → controller → service → model).
- Record key decisions and trade-offs in one or two sentences each.
- Write in plain language, matching the existing style. Sections I wrote myself
  (request flow, protected requests) can be extended, but don't rewrite them without asking.
- Commit separately: `docs: update architecture map for <feature>`.

**notes/week-N.md** (at the end of each work session):
- Add a dated entry with what was built and any debugging stories, written as
  symptom → hypothesis → test → fix.
- Add key learnings in one line each.

**DEVLOG.md** (at the end of each week, or whenever I ask):
- Draft the weekly entry from that week's notes and commit history.
- Use this structure for every entry:
  1. **Week N (dates)**
  2. **Summary**: 3–5 plain-English sentences a non-technical reader understands.
     What users can now do, progress against the plan, and any risks. No jargon.
  3. **Progress against plan**: what was planned vs. what got done.
  4. **Challenges and troubleshooting**: the most instructive problems, showing my
     thought process (symptom → what I suspected → how I tested it → the fix).
  5. **Key learnings**
  6. **Screenshots**: reference images in `docs/screenshots/`. Tell me which
     screenshots to take and what to name them; don't invent image files.
  7. **Code snippets**: short, meaningful excerpts that show a milestone.
  8. **Next week**
- Back-fill entries for weeks 1–3 from `notes/week-1.md`, `week-2.md` and `week-3.md`.
  Week 2 says only that development paused for personal reasons, with no further detail.
- Write in the first person, honestly. Never invent events, errors or results that
  aren't in the notes or commits. Mark each new entry `DRAFT — for review` until I approve it.
- Commit separately: `docs: add devlog entry for week N`.

## Environment

- Windows, VS Code, **Git Bash** terminal (not PowerShell). Use bash syntax.
- Project root: `C:\RepRadar\repradar` (`/c/RepRadar/repradar` in Git Bash).
- Node 24 (LTS), npm. `git config push.autoSetupRemote` is on.
- Windows ignores filename case but Linux (Render, CI) doesn't: match `require`/`import`
  paths to the exact file case.
- Two dev servers run at once: `server/` on port 4000, `client/` on port 5173.

## Repository layout

```
repradar/
├── server/                 Express API (CommonJS)
├── client/                 React app (Vite, JavaScript)
├── .github/workflows/      server-tests.yml (lint + tests on push/PR)
├── docs/screenshots/       images for README and devlog
├── notes/                  daily notes (week-1.md, week-2.md, week-3.md)
├── ARCHITECTURE.md         the student's map of the codebase
├── DEVLOG.md               weekly devlog
└── README.md               required sections listed under "Final deliverables"
```

## Backend (server/)

**Stack:** Express 5, Mongoose 9, MongoDB Atlas, CommonJS (`require`/`module.exports`).

**Layered architecture. Each layer only talks to its neighbours:**

```
routes → middleware/validators → controllers → services → models → MongoDB
```

```
server/src/
├── app.js            builds the app: helmet, cors, json, routes, 404, errorHandler (in that order)
├── server.js         checkEnv → connectDB → listen
├── config/           db.js, env.js (required env check), constants.js (shared enums)
├── routes/           URL + method → validators/middleware → controller
├── middleware/       requireAuth, handleValidation, errorHandler
├── validators/       express-validator rule arrays ending with handleValidation
├── controllers/      thin: read req, call service, send res
├── services/         business logic; throw AppError for expected failures
├── models/           Mongoose schemas; toJSON strips private fields
└── utils/            AppError, and pure functions (recovery, recommendations, haversine)
```

**Conventions:**

- Controllers stay thin and have **no try/catch**: Express 5 forwards async errors to `errorHandler`.
- Services throw `new AppError(status, message)` for expected failures (404, 409, 401...).
  `errorHandler` returns `{ message }`; 500s show a generic message and log the real error.
- Validation lives in `validators/` using express-validator, ending each rule array with
  `handleValidation`, which returns 400 with `{ message, errors: [{ field, message }] }`.
- Protected routes put `requireAuth` before the controller. It verifies the JWT
  (`Authorization: Bearer <token>`) and sets `req.userId`. **Always scope user data queries
  by `req.userId`** (e.g. `Workout.find({ user: req.userId })`) so users can't access
  each other's data. Never trust a user id sent by the client.
- Services only take named fields from input (no passing `req.body` straight into a model).
- Shared enums (goals, equipment, muscle groups) live in `config/constants.js`.
- New required environment variables must be added to `REQUIRED` in `config/env.js`
  and to `server/.env.example`.
- `config/db.js` and `tests/helpers/db.js` call `dns.setServers(['1.1.1.1', '8.8.8.8'])`.
  **Do not remove it**: it fixes a Windows `querySrv ECONNREFUSED` error with Atlas SRV records.
- CORS origins come from `CLIENT_ORIGIN` (comma-separated) and are cleaned defensively
  (trim, quotes, trailing slash). Keep cors registered before routes.

**Environment variables (server/.env):** `PORT`, `MONGO_URI`, `MONGO_URI_TEST`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `CLIENT_ORIGIN`. Never commit `.env`. Production uses different secrets.

**Scripts:** `npm run dev` (node --watch --env-file=.env), `npm start`, `npm test`,
`npm run lint`, `npm run format`.

## Frontend (client/)

**Stack:** React with Vite (JavaScript, not TypeScript), React Router v8.5
(import from `'react-router'`), Context API + useReducer, Recharts (for charts later).

```
client/src/
├── services/     api.js (apiRequest helper) + one file per resource (authService.js...)
├── context/      AuthContext.js (createContext only), AuthProvider.jsx (reducer + provider)
├── hooks/        useAuth.js, later useGeolocation.js
├── components/   small reusable pieces
└── pages/        full screens (Login, Signup, Dashboard, LogWorkout, Exercises, CheckIn, Progress)
```

**Conventions:**

- **Components never call `fetch` directly.** They call service functions, which use `apiRequest`.
- `apiRequest` throws errors with `.status` and `.details` (validation field errors) so forms
  can show messages next to fields.
- Auth state: `status` is `'loading' | 'authenticated' | 'guest'`. Don't redirect while `'loading'`.
  Token stored in `localStorage` under `repradar_token` (HTTP-only cookies are a noted future improvement).
- Keep files exporting either components or non-components, not both (Vite fast refresh).
- `VITE_` env vars are public. Only `VITE_API_URL` belongs there; never secrets.
- Mobile-first, responsive layouts. Keep styling simple (CSS Modules or plain CSS).

## Testing

- **Server:** Jest + Supertest in `server/tests/`. `tests/setupEnv.js` loads `.env` and sets
  test JWT values. Tests use a separate Atlas database via `MONGO_URI_TEST`, which **must**
  contain `/repradar-test` (`tests/helpers/db.js` refuses to run otherwise).
  Tests run with `jest --runInBand` because files share one database. Clear collections after each test.
- **Do not reintroduce mongodb-memory-server.** It failed with a driver handshake error
  ("Missing required sub-document 'driver'").
- Pure functions in `utils/` get unit tests, written **test-first**.
- Every new API resource gets tests for: success, validation failure (400), unauthenticated (401),
  not found (404), and **another user's data is not accessible**.
- **Client:** use Vitest + React Testing Library (Vite's standard, Jest-compatible API) for key
  forms and the dashboard. Note this choice in the devlog, since the proposal said Jest.
- Always watch a new test fail once before trusting it.
- CI (`.github/workflows/server-tests.yml`) runs lint and tests with secret `MONGO_URI_TEST`.
  Add a client job once client tests exist.

## Deployment

- **Backend:** Render web service `repradar-api`, Oregon, root `server`, build `npm install`,
  start `npm start`, Node 24 (`engines`). Env vars set in Render's dashboard. Auto-deploys from `main`.
  Health check: `GET /health` → `{ "status": "ok" }`.
- **Frontend:** Vercel, root directory `client`, `VITE_API_URL` = the Render URL.
  Add a `client/vercel.json` rewrite to `index.html` so React Router routes work on refresh.
  Add the Vercel URL to Render's `CLIENT_ORIGIN` (comma-separated with localhost).
- **Monitoring:** UptimeRobot (or similar) pinging `/health`; Render logs.

## Data model (from the approved proposal)

| Collection | Key fields |
| --- | --- |
| User (done) | name, email, passwordHash, goal, equipment[], gymLocation {lat, lng}, weeklyGoal |
| Exercise | name, muscleGroups[], equipment, description |
| Workout | user (ref), date, entries[] {exercise (ref), sets[] {reps, weight}} |
| CheckIn | user (ref), timestamp, coordinates, verified |

Suggested muscle groups constant: chest, back, shoulders, biceps, triceps, quads,
hamstrings, glutes, calves, core. Equipment values already exist in `config/constants.js`
and must match exercise data.

## Status

**Done**
- Repo, folder structure, ESLint + Prettier (server), GitHub Actions CI
- Express app with `/health`, MongoDB Atlas connection, startup env check
- Auth backend: User model, signup, login, JWT, `requireAuth`, `GET /api/users/me`, tests
- Deployed backend on Render
- Helmet and CORS
- React client scaffolded; api service layer; AuthContext/AuthProvider/useAuth
  (currently a temporary `App.jsx` that shows auth status)

**Current branch:** `feature/auth-frontend`

## Remaining build order

1. **Auth frontend:** Login and Signup pages with field-level errors, React Router routes,
   `ProtectedRoute` (waits for `'loading'`), navbar with logout, `PATCH /api/users/me` for
   goal, equipment, weeklyGoal and gymLocation, plus a simple settings page. Deploy to Vercel. Merge PR.
2. **Exercise library:** Exercise model; one-time seed script (`server/scripts/seedExercises.js`)
   from the free wger API as in the proposal, mapped to our muscle group and equipment constants
   (fall back to a curated JSON file if wger mapping takes too long; ask me first).
   `GET /api/exercises` with search, muscle and equipment filters. Exercises page with search.
3. **Workout logging:** Workout model; full CRUD scoped to the user; tests including
   cross-user access; Log Workout page with nested exercises and sets; history with edit and delete.
4. **Core logic as pure functions (test-first):** `utils/recovery.js` (days since each muscle group
   was trained), `utils/recommendations.js` (rule-based suggestions for the most neglected groups,
   filtered by equipment and goal), `utils/distance.js` (Haversine).
5. **Dashboard:** muscle recovery view colour-coded from recently trained to neglected
   (keep thresholds as constants), plus recommendations.
6. **Gym check-ins:** CheckIn model; `POST /api/checkins` verifies the user is within a configurable
   radius (default 150 m) of their saved gym; streak counter and weekly goal; `useGeolocation` hook.
   Location is used only at check-in time, never tracked in the background.
7. **Progress charts:** Recharts; weight over time for a chosen exercise and weekly check-in history.
8. **Hardening and deliverables:** express-rate-limit on login, responsive and cross-browser checks,
   uptime monitor, client tests, README, DEVLOG.

Not part of this project: stretch goals (templates, partners, email reminders) and the RAG/AI
experiment, which happens later on a separate branch after submission.

## Final deliverables

- Live app link (Vercel) and public GitHub repo.
- README sections: Project Overview, Features, Installation Instructions, Usage,
  Technologies Used, Future Improvements. Mention AI-assisted development.
- DEVLOG.md: weekly entries with a plain-English summary first, then technical detail
  (challenges and troubleshooting process, key learnings, screenshots, code snippets).

## Don'ts

- Don't commit `.env` files or paste secrets into code, logs or docs.
- Don't run `npm audit fix --force` (it can install breaking major versions).
- Don't put `fetch` calls in components.
- Don't remove the DNS workaround or the test database safety check.
- Don't push feature work straight to `main`.
- Don't add features outside the approved scope without asking.