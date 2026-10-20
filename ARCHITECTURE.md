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

## Testing
- Tests use a separate `repradar-test` database (`MONGO_URI_TEST`), never real data.
- `tests/helpers/db.js` refuses to run unless the URI points to `repradar-test`.
- Tests run one file at a time (`jest --runInBand`) because they share one database.