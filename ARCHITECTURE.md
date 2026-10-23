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
- `pages/` — full screens: `Login`, `Signup`, `Dashboard`, `Exercises`, `Settings`, `NotFound`
- `components/` — reusable pieces:
  - `ProtectedRoute` — only lets logged-in users through, otherwise sends them to `/login`
  - `GuestRoute` — the opposite, for login and signup
  - `Layout` + `Navbar` — the navbar (with logout) shown on every logged-in page
  - `FormField` — a label, input and error message
- `services/` — the only place that talks to the API. `api.js` has the shared
  `apiRequest` helper; there is one file per resource (`authService`, `userService`,
  `exerciseService`).
- `context/` + `hooks/useAuth.js` — shared login state (see below)
- `hooks/useDebouncedValue.js` — waits until the user stops typing before searching
- `utils/formErrors.js` — turns the API's validation errors into one message per field
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
- **Express 5 and `req.query`:** express-validator's clean-ups (like turning
  `"20"` into `20`) don't stick to `req.query` in Express 5, so controllers read
  validated query values with `matchedData(req)`.

## Testing
- Tests use a separate `repradar-test` database (`MONGO_URI_TEST`), never real data.
- `tests/helpers/db.js` refuses to run unless the URI points to `repradar-test`.
- Tests run one file at a time (`jest --runInBand`) because they share one database.
- Each test file clears the database when it connects, so data left over from a
  crashed run or a manual check can't break the next run.
- Pure functions in `utils/` (like `wgerMapping.js`) have unit tests that need no database.