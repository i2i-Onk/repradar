# RepRadar Architecture Map

## Folder structure
- `client/` — React frontend (Vite)
- `server/` — Express REST API
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

## Frontend (client/src)

- `main.jsx` — starts the app: `BrowserRouter` → `AuthProvider` → `App`
- `App.jsx` — the list of every page (route) and who may see it
- `pages/` — full screens: `Login`, `Signup`, `Dashboard`, `Settings`, `NotFound`
- `components/` — reusable pieces:
  - `ProtectedRoute` — only lets logged-in users through, otherwise sends them to `/login`
  - `GuestRoute` — the opposite, for login and signup
  - `Layout` + `Navbar` — the navbar (with logout) shown on every logged-in page
  - `FormField` — a label, input and error message
- `services/` — the only place that talks to the API. `api.js` has the shared
  `apiRequest` helper; there is one file per resource (`authService`, `userService`).
- `context/` + `hooks/useAuth.js` — shared login state (see below)
- `utils/formErrors.js` — turns the API's validation errors into one message per field
- `constants.js` — goal and equipment options; must match `server/src/config/constants.js`

### How a page talks to the API

A page never calls `fetch` itself. It calls a function from `useAuth()` or a
service, which calls `apiRequest`, which sends the request with the token.
If the API answers with an error, `apiRequest` throws an error with
`.status` and `.details`, and the page shows the messages next to the right fields.

**Example — saving settings:** `Settings` page → `updateProfile()` from
`useAuth` → `userService.updateMe()` → `apiRequest` → `PATCH /api/users/me`.
On success, `AuthProvider` stores the updated user, so every page sees the change.

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

## Testing
- Tests use a separate `repradar-test` database (`MONGO_URI_TEST`), never real data.
- `tests/helpers/db.js` refuses to run unless the URI points to `repradar-test`.
- Tests run one file at a time (`jest --runInBand`) because they share one database.