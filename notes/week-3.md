# Week 3 notes

## Mon Oct 19
- Resumed after a 10-day break for personal reasons. Requested an extension and
  switched to a faster "build first, review after" approach to protect the deadline.
- **CI workflow didn't appear in GitHub Actions.** Checked with `ls` and `git status`:
  the workflow file had never been created or committed. Recreated it with a bash
  heredoc to guarantee the correct path (`.github/workflows/` at the repo root).
- **Render deploy failed: `MONGO_URI is not set`.** Render has no `.env` file;
  variables must be added in its dashboard. Later failed again on `JWT_SECRET`,
  caught by the new startup env check with a clear message. Used a separate
  JWT secret for production so a local leak can't affect the live app.
- **`Cannot find module '../config/constants'`.** Read the require stack (it traced
  my architecture layers from server.js down to User.js), worked out the expected
  path from `../`, and found the file was missing. Learned that Windows ignores
  filename case but Linux (Render, CI) doesn't.
- **npm audit:** 19 moderate vulnerabilities, all in dev tools. Checked production
  dependencies with `npm audit --omit=dev`. Avoided `npm audit fix --force`
  because it can install breaking major versions.
- **Test database switch.** All 9 database tests failed. Found the *first* error
  (`Missing required sub-document 'driver'`, a handshake mismatch between the
  MongoDB driver and the in-memory server version). The `buffering timed out`
  errors were knock-on effects: Mongoose queues queries while waiting for a
  connection that never came. Pinning the server version didn't fix it, so
  switched to a separate `repradar-test` database on Atlas, with a safety check
  so tests can never wipe real data. Tests run one file at a time (`--runInBand`)
  because they share one database.
- **Least privilege:** tests currently use the same database user as the app. A
  stricter setup would use a test-only user that can only access `repradar-test`,
  since that connection string is stored as a GitHub secret. Noted as a future improvement.
- **Key lesson:** when many things fail at once, find the first error. The rest
  are often symptoms of it.
- CORS error in the browser even though curl worked. CORS is enforced by browsers, not servers, which is why curl was unaffected. A request with an Authorization header triggers a preflight OPTIONS request, and the API must answer it with Access-Control-Allow-Origin. Diagnosed by sending a fake preflight with curl -i -X OPTIONS. Access-Control-Allow-Headers was present but Allow-Origin wasn’t, which meant CORS was running but rejecting the origin. Logged the allowed-origins list, then made the parsing defensive (trim spaces, quotes, trailing slashes and hidden Windows line endings). Also confirmed middleware order: CORS must come before routes and the 404 handler.

## Wed Oct 21
- **Built the auth frontend** on `feature/auth-frontend`: React Router routes,
  `ProtectedRoute` and `GuestRoute` guards, Login and Signup pages with errors shown
  next to each field, a navbar with logout, and a Settings page for goal, equipment,
  weekly goal and gym location.
- **Added `PATCH /api/users/me`** with 7 new tests (success, only-sent-fields change,
  email can't be changed, 400, 401, 404, another user's data untouched). 17 server tests pass.
- **A test passed before the feature existed.** Wrote the PATCH tests first and ran
  them: 6 failed as expected, but the 404 test passed. Suspected it was passing for the
  wrong reason. With no PATCH route yet, the request fell through to the app's
  "Route not found" handler, which also returns 404. It only became a real test once
  the route existed. Lesson: when watching tests fail first, check *why* each one
  fails or passes, not just the count.
- **Prettier flagged 19 files I hadn't touched.** `prettier --check` reported style
  issues in almost every server file. So many files at once suggested a global cause
  rather than real style problems. Ran `file src/app.js`: "with CRLF line terminators".
  `git config core.autocrlf` is `true`, so Git checks files out with Windows line
  endings but stores them with LF; Prettier expects LF. Formatted only my new files,
  then added `"endOfLine": "auto"` to `.prettierrc`. Re-running the check showed my
  hypothesis was only partly right: 13 files still failed. Diffing them showed real
  (cosmetic) differences: most are missing a final newline, and one long line in
  `app.js` would be split. Line endings were hiding a second, smaller cause.
- `react-router` installed as v8.5, not v7 as planned; imports from `'react-router'`
  work the same.

**Key learnings**
- Route guards that wait for `'loading'` stop logged-in users being bounced to login on refresh.
- Only copying named fields in the service stops users changing fields they shouldn't (like email).
- Many failures at once usually share one cause (again).

## Fri Oct 23
- Auth frontend PR (#3) merged; frontend live on Vercel.
- **Built the exercise library** on `feature/exercise-library`: Exercise model,
  wger → RepRadar mapping (pure function, 11 unit tests), a seed script, and
  `GET /api/exercises` with search, muscle and equipment filters (11 API tests),
  plus an Exercises page with debounced search and filters. 43 server tests pass.
- **wger vs curated JSON.** Checked wger's muscle and equipment lists first
  (15 and 12 items), which made it clear a lookup table would work, so I used wger.
  A dry run over all 932 exercises mapped 670, with no duplicate names.
- **149 exercises skipped for equipment.** Looked at why before changing any rule:
  128 have an empty equipment list, and they mix machines (Seated Hip Adduction,
  Leg Extension) with bodyweight moves (Deadbug, Glute Bridge). Defaulting them
  to bodyweight would make recommendations suggest machines to people without
  them, so I kept skipping them.
- **Seed re-run said "updated: 2" for identical data.** Symptom: the "run twice,
  no duplicates" test failed because the second run reported every exercise as
  updated instead of unchanged. Hypothesis: Mongoose's `timestamps` adds a fresh
  `updatedAt` to every update, so the document always changes. Test: turned
  timestamps off for the seed's updates and set the dates only on first insert.
  The test passed, and re-running the real seed against the test database gave
  `inserted: 0, updated: 0, unchanged: 670`.
- **A test failed only after a manual check.** Symptom: "lists all exercises"
  expected 5 but got 675, and passed when re-run. Hypothesis: my manual check had
  seeded 670 exercises into the test database, and tests only cleared data *after*
  each test, so the first test saw leftovers. Test: seeded the test database again
  on purpose and ran the tests: same failure, reproduced. Fix: `connectTestDB`
  now clears the database right after connecting.
- **Express 5 `req.query`:** express-validator's `.toInt()` didn't change
  `req.query.limit` (still a string). Confirmed with a tiny test app; used
  `matchedData(req)` in the controller instead.

**Key learnings**
- A test that fails only because a file is missing doesn't prove much. Fail it against a stub first.
- "Passes on re-run" isn't a fix: reproduce the failure on purpose to prove the cause.
- An upsert keyed on a stable outside id (`wgerId`) makes a seed safe to run again.
- Look at what's being skipped before loosening a rule; the safe default can be "skip". 