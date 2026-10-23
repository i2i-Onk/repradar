# RepRadar Architecture Map

## Folder structure
- `client/` — React frontend (Vite)
- `server/` — Express REST API
  - `server/scripts/` — one-off scripts run by hand, e.g. `seedExercises.js`
- `docs/` — screenshots and diagrams for the README and devlog
- `notes/` — daily notes that feed the weekly devlog

## Request flow

When the React app needs something from the API, it sends an HTTP request.
The request passes through these layers in order:

1. **Route** — an HTTP method and URL, mapped to a controller.
2. **Middleware** — runs before the controller, checking things like login status and whether the input is valid.
3. **Controller** — receives the request, calls the service, and sends the response.
4. **Service** — business logic; where the real work happens.
5. **Model** — the Mongoose schema and database queries.
6. **MongoDB** — stores the data.

The response then travels back up through the same layers to the browser.

**Rule of thumb:** each layer only talks to its neighbours and has one job.

**Example — signing up:** the user fills out the signup form, and the route
passes the request to middleware, which checks the input is valid. The
controller then calls the signup service, which checks the email isn't already
taken and hashes the password. The model confirms the data has the right shape,
and MongoDB stores the new user.

## How a protected request works

1. **Getting a token:** when a user signs up or logs in, `authService` creates a
   JWT containing the user's id, signed with `JWT_SECRET`. The client stores it
   and sends it with every later request as `Authorization: Bearer <token>`.
2. **Checking the token:** protected routes run the `requireAuth` middleware
   (`src/middleware/requireAuth.js`) before the controller. It verifies the
   token's signature and expiry. A missing, tampered or expired token gets a
   401 response, and the request never reaches the controller.
3. **Knowing who the user is:** if the token is valid, `requireAuth` puts the
   user's id on `req.userId`. Controllers and services use that id, never
   anything the client claims about itself, so users can only access their own data.

**To protect a new route:** add `requireAuth` before its controller, e.g.
`router.get('/me', requireAuth, userController.getMe);`

**Example — saving settings (`PATCH /api/users/me`):**
`userRoutes` → `requireAuth` (who is this?) → `updateMeRules` in
`validators/userValidators.js` (are the values allowed?) → `userController.updateMe`
→ `userService.updateUser` → User model. The service copies only four named
fields (goal, equipment, weeklyGoal, gymLocation), so sending `email` or `_id`
in the body does nothing, and it updates the user from `req.userId`, never an id
from the client.

**Example — searching exercises (`GET /api/exercises?search=bench&muscle=chest`):**
`exerciseRoutes` → `requireAuth` → `listExercisesRules` in
`validators/exerciseValidators.js` (is `muscle` one of our groups? is `limit` 1–100?)
→ `exerciseController.list` → `exerciseService.listExercises` → Exercise model.
The response is `{ exercises, total }`, sorted by name, at most 50 by default.
Exercises are a shared library, so there's no per-user filter here.

**Example — logging a workout (`POST /api/workouts`):**
`workoutRoutes` (`router.use(requireAuth)` protects every workout route) →
`createWorkoutRules` in `validators/workoutValidators.js` (at least one exercise,
each with 1–20 sets; reps 1–1000; weight 0–1000 kg; date not in the future) →
`workoutController.create` → `workoutService.createWorkout` (checks every exercise
id is in the library, copies only `exercise`, `reps` and `weight`) → Workout model.
The response fills in each exercise's name, muscle groups and equipment (`populate`).

**Keeping workouts private:** every workout query in `workoutService` includes
`user: req.userId`, e.g. `Workout.findOne({ _id: id, user: userId })`. Asking for,
editing or deleting someone else's workout gets the same 404 as a workout that
doesn't exist, so the API never confirms that another user's workout id is real.

| Method and URL | Does |
| --- | --- |
| `GET /api/workouts` | Your workouts, newest first (50 by default, `?limit=` up to 100) |
| `POST /api/workouts` | Log a workout → 201 |
| `GET /api/workouts/:id` | One of your workouts |
| `PUT /api/workouts/:id` | Replace its date and exercises |
| `DELETE /api/workouts/:id` | Delete it → 204 |

## Recovery and recommendations (the core logic)

The rules that make RepRadar useful live in `server/src/utils/` as **pure
functions**: they take plain data and return plain data, with no database and no
`req`/`res`. That makes them easy to unit-test (they were written test-first) and
easy to reuse.

| File | Does |
| --- | --- |
| `recovery.js` | `calculateRecovery(workouts, now)`: for each of the 10 muscle groups, when it was last trained, how many days ago, and its status (`recent`, `due` or `neglected`). Never trained counts as neglected. Primary muscles only. |
| `recommendations.js` | `recommendExercises({ recovery, exercises, equipment, goal })`: exercises for the 3 most neglected groups, plus a rep range for the goal |
| `distance.js` | `distanceInMetres(a, b)`: Haversine distance, for gym check-ins (next step) |

The thresholds (`RECOVERY_THRESHOLDS`: 0–2 days recent, 3–5 due, 6+ neglected) and
rep ranges (`REP_RANGES`: strength 3–6, hypertrophy 8–12, general 10–15) are in
`config/constants.js`.

**Example — loading the dashboard (`GET /api/dashboard`):**
`dashboardRoutes` → `requireAuth` → `dashboardController.get` →
`dashboardService.getDashboard`, which loads the user and *only their* workouts,
calls `calculateRecovery`, fetches candidate exercises (groups that need work,
equipment the user has), and calls `recommendExercises`. The response is
`{ recovery, recommendations: { repRange, groups }, thresholds, goal }`.

**Recommendation rules, in order:**
1. Most neglected first: never trained, then the most days since training.
2. Skip groups trained in the last 2 days (still recovering).
3. Only exercises with equipment the user has selected; no stretches.
4. Focused exercises first (fewest muscle groups), then alphabetical.
5. Up to 3 per group, skipping near-duplicates (same equipment and mostly the same
   words, e.g. "Alternating bicep curls" and "Alternating Biceps Curls With Dumbbell").
6. No exercise is suggested for two groups. A group with nothing usable is skipped.

## Exercise library and the seed script

The exercises come from the free [wger](https://wger.de) API, imported once by
`server/scripts/seedExercises.js`. The work is split into three parts:

1. **The script** fetches every page of exercises from wger.
2. **`utils/wgerMapping.js`** (a pure function, unit-tested) turns each wger
   exercise into ours: English name, our muscle groups, one equipment value, and
   a plain-text description. It returns `null` for exercises it can't map.
3. **`exerciseService.upsertExercises`** saves them. Each exercise is matched by
   its `wgerId`: updated if it's already there, inserted if not. Nothing is deleted.

**Running it:** `npm run seed:exercises` is a dry run. It connects to the
database in `MONGO_URI`, prints its name, and reports how many exercises would be
inserted, updated or unchanged (`exerciseService.previewUpsertExercises`, which
only reads). `npm run seed:exercises -- --write` does the same, then saves. Because local and production
share one database, it's built to be safe to run again: a second run reports
`{ inserted: 0, updated: 0, unchanged: 670 }`.

## Frontend (client/src)

- `main.jsx` — starts the app: `BrowserRouter` → `AuthProvider` → `App`
- `App.jsx` — the list of every page (route) and who may see it
- `pages/` — full screens: `Login`, `Signup`, `Dashboard`, `Exercises`, `LogWorkout`,
  `WorkoutHistory`, `EditWorkout`, `Settings`, `NotFound`
- `components/` — reusable pieces:
  - `ProtectedRoute` — only lets logged-in users through, otherwise sends them to `/login`
  - `GuestRoute` — the opposite, for login and signup
  - `Layout` + `Navbar` — the navbar (with logout) shown on every logged-in page
  - `FormField` — a label, input and error message
  - `WorkoutForm` — the exercises-and-sets form, shared by `LogWorkout` and `EditWorkout`
  - `ExercisePicker` — searches the exercise library and adds the chosen exercise
- `services/` — the only place that talks to the API. `api.js` has the shared
  `apiRequest` helper; there is one file per resource (`authService`, `userService`,
  `exerciseService`, `workoutService`, `dashboardService`).
- `context/` + `hooks/useAuth.js` — shared login state (see below)
- `hooks/useDebouncedValue.js` — waits until the user stops typing before searching
- `utils/formErrors.js` — turns the API's validation errors into one message per field
- `utils/dates.js` — converts between date inputs and stored dates (see Key decisions)
- `constants.js` — goal, equipment and muscle group options; must match
  `server/src/config/constants.js`

### How a page talks to the API

A page never calls `fetch` itself. It calls a function from `useAuth()` or a
service, which calls `apiRequest`, which sends the request with the token.
If the API answers with an error, `apiRequest` throws an error with
`.status` and `.details`, and the page shows the messages next to the right fields.

**Example — saving settings:** `Settings` page → `updateProfile()` from
`useAuth` → `userService.updateMe()` → `apiRequest` → `PATCH /api/users/me`.
On success, `AuthProvider` stores the updated user, so every page sees the change.

**Example — searching exercises:** typing in the `Exercises` search box updates
`search`; `useDebouncedValue` passes it on 300 ms after typing stops; an effect
calls `exerciseService.listExercises()` → `apiRequest` → `GET /api/exercises`.
If the filters change before an answer arrives, that older answer is ignored, so
a slow response can't overwrite newer results.

**The dashboard** (`/`, where users land after login) calls `getDashboard()` and
shows one tile per muscle group, coloured by status and labelled in words, with a
legend built from the thresholds in the response, then the suggestions below.
The page never works out recovery itself; it only displays what the API sends.

**Example — logging a workout:** `LogWorkout` renders `WorkoutForm`, which keeps
the inputs as text while you type. On save, it converts them to the API's shape
(exercise ids, numbers, an empty weight as 0) and calls `createWorkout()` from
`workoutService` → `POST /api/workouts`. Validation errors come back with paths
like `entries[0].sets[1].reps`, so each message appears under the exact set.

### How login state works

`AuthProvider` keeps `{ user, token, status }` in a reducer. `status` starts as
`'loading'` while a saved token (in `localStorage`) is checked with
`GET /api/users/me`, then becomes `'authenticated'` or `'guest'`.
The route guards wait while it is `'loading'`, so refreshing the page doesn't
bounce a logged-in user to the login screen.

## Key decisions

- **Route guards decide where users go.** After login, `GuestRoute` redirects to
  the page the user originally asked for. The login page doesn't navigate itself,
  so there's one place in charge of redirects.
- **Signup asks only for name, email and password.** Goal, equipment and weekly
  goal have sensible defaults and can be changed on the Settings page.
- **Location is read only on a button click** (Settings, and later check-ins),
  never tracked in the background.
- **Token in `localStorage`** is simple but readable by any script on the page.
  HTTP-only cookies would be safer; noted as a future improvement.
- **wger over a hand-written list.** wger's 15 muscles and 12 equipment types map
  cleanly to ours with a lookup table, giving 670 of 932 exercises.
- **Skip rather than guess.** 128 wger exercises list no equipment, and they mix
  machines (leg extension) with bodyweight moves (dead bug). Calling them all
  bodyweight would make recommendations suggest machines to people without them,
  so they're skipped. Machines are recognised by name ("machine", "Smith", "leg press"),
  because wger has no machine equipment type.
- **Primary muscles only.** Secondary muscles are ignored so the recovery view
  counts what an exercise mainly trains.
- **One equipment value per exercise.** When wger lists several, the main one
  wins (barbell > dumbbell > kettlebell > cable > band > bodyweight); benches are ignored.
- **Search text is escaped** before it's used in a database regex, so typing `(`
  can't cause an error or a very slow query.
- **Another user's workout returns 404, not 403**, so the API doesn't confirm
  that a workout id belongs to someone.
- **Editing replaces the whole workout (`PUT`)** rather than patching parts of it,
  because the edit form always sends every exercise and set.
- **Weights are in kilograms**, and an empty weight is saved as 0 (bodyweight).
- **Workout dates are saved at 12:00 local time** on the chosen day. A date input
  gives `YYYY-MM-DD`, and treating that as midnight UTC would show the previous day
  in North America. Noon stays on the same day in the time zones users are likely
  to be in. Dates more than a day in the future are rejected.
- **Days since training are rounded, not floored.** Workouts are saved at local
  noon, so rounding the time since then gives the user's own calendar-day
  difference, without the server knowing their time zone.
- **Recovery status comes from the server.** The thresholds live only in
  `config/constants.js` and are sent with the dashboard, so the colours and the
  legend can't disagree.
- **"Only equipment the user has" is taken literally:** bodyweight exercises are
  only suggested if Bodyweight is ticked in Settings.
- **Colour is never the only signal:** each tile also says Recent, Due or
  Neglected, and the status text passes WCAG AA contrast (4.5:1 or better).
- **The dashboard loads all of a user's workouts** to find each group's last
  session. Fine at this scale; a database aggregation would be the next step if
  histories grew to thousands of workouts.
- **Express 5 and `req.query`:** express-validator's clean-ups (like turning
  `"20"` into `20`) don't stick to `req.query` in Express 5, so controllers read
  validated query values with `matchedData(req)`.

## Testing
- Tests use a separate `repradar-test` database (`MONGO_URI_TEST`), never real data.
- `tests/helpers/db.js` refuses to run unless the URI points to `repradar-test`.
- Tests run one file at a time (`jest --runInBand`) because they share one database.
- Each test file clears the database when it connects, so data left over from a
  crashed run or a manual check can't break the next run.
- Pure functions in `utils/` (`wgerMapping`, `recovery`, `recommendations`, `distance`) have
  unit tests that need no database, written before the code.