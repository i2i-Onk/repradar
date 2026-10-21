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
  endings but stores them with LF; Prettier expects LF. The committed files are fine.
  Formatted only my new files. Possible fix later: `"endOfLine": "auto"` in `.prettierrc`.
- `react-router` installed as v8.5, not v7 as planned; imports from `'react-router'`
  work the same.

**Key learnings**
- Route guards that wait for `'loading'` stop logged-in users being bounced to login on refresh.
- Only copying named fields in the service stops users changing fields they shouldn't (like email).
- Many failures at once usually share one cause (again). 