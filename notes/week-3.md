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
- **Dry run now checks the real database.** It connects, prints the database name,
  and reports would-be inserts, updates and unchanged without saving. A test checks
  the preview gives the same numbers as the real run that follows it. Against the
  test database: dry run said 670 inserts with 0 saved; after `--write`, the dry
  run said 670 unchanged.
- **Credited wger in the README.** Checked the API instead of guessing the licence:
  each exercise has its own (565 CC BY-SA 4.0, 89 CC BY-SA 3.0, 16 CC0).
- **Express 5 `req.query`:** express-validator's `.toInt()` didn't change
  `req.query.limit` (still a string). Confirmed with a tiny test app; used
  `matchedData(req)` in the controller instead.

**Key learnings**
- A test that fails only because a file is missing doesn't prove much. Fail it against a stub first.
- "Passes on re-run" isn't a fix: reproduce the failure on purpose to prove the cause.
- An upsert keyed on a stable outside id (`wgerId`) makes a seed safe to run again.
- Look at what's being skipped before loosening a rule; the safe default can be "skip". 
## Fri Oct 23 (later): workout logging
- Exercise library PR (#4) merged; ran the seed on the shared database (670 exercises).
- **Built workout logging** on `feature/workout-logging`, working autonomously with
  Claude Code: Workout model, full CRUD API (`/api/workouts`), a Log Workout page
  that adds exercises from the library with sets of reps and weight, and a history
  page with edit and delete. 23 new API tests; 69 server tests pass.
- **Privacy rule:** every workout query includes `user: req.userId`. Tests check that
  another user gets 404 when reading, editing or deleting your workout, and that the
  workout is unchanged or still there afterwards.
- **Watched the tests fail first:** 20 of 22 failed before the routes existed. The 2
  "not found → 404" tests passed by accident (no route also gives 404), the same
  trap as the PATCH test on Wednesday.
- **Time zone trap with dates.** A date input gives `2026-10-23`, and
  `new Date('2026-10-23')` is midnight UTC, which is Oct 22 here (UTC−7). Saved the
  chosen day at 12:00 local time instead. Checked in four time zones: the fix kept
  the right day in all of them, while the naive version showed the day before in
  Vancouver. Git Bash didn't pass `TZ=...` to Node on Windows (it printed
  `undefined`), so I set `process.env.TZ` inside the script instead.
- **CORS for PUT and DELETE:** the first pages to use these methods. Checked a
  preflight for both against a temporary server on the test database; both allowed.

**Key learnings**
- Scope every query by the logged-in user, and test that another user gets nothing.
- Return 404 rather than 403 for other users' data, so ids aren't confirmed.
- Dates from `<input type="date">` have no time zone: decide on purpose how to store them.

## Fri Oct 23 (evening): recovery dashboard
- Workout logging PR (#5) merged.
- **Built steps 4 and 5** on `feature/recovery-dashboard`, working autonomously with
  Claude Code: `recovery.js`, `recommendations.js` and `distance.js` as pure functions
  (all test-first), `GET /api/dashboard`, and a Dashboard page with colour-coded
  muscle groups and suggestions. 49 new tests; 118 server tests pass.
- **Counting days without knowing the time zone.** Workouts are saved at local noon,
  so rounding (not flooring) the time since then gives the user's calendar-day
  difference. Tests cover "today" both early morning and late night, and
  "yesterday" just after midnight.
- **A sort that worked by accident.** Never-trained groups used `Infinity`, and
  `Infinity - Infinity` is `NaN`. The test passed because sort treats `NaN` as
  "equal", but only by luck. Switched to a large finite number.
- **Real data showed what unit tests couldn't.** After all tests passed, I ran the
  recommendations against the real 670 exercises (in the test database). Biceps got
  "Alternating bicep curls", "Alternating Biceps Curls With Dumbbell" and
  "Alternating Dumbbell Curl": three copies of one exercise. Hypothesis: the
  alphabetical tie-break picks wger's duplicate entries. Fix: skip a candidate with
  the same equipment and mostly the same name words. A first version would also
  have merged "Dumbbell Leg Curl" and "Lying Leg Curl" (different exercises); an
  existing test caught that, so the rule now requires the same equipment. Also
  excluded stretches, which showed up as chest and shoulder "training".
- **Still weak:** alphabetical order favours odd names ("4-count burpees",
  "Active Hang"). wger has no popularity data. Noted as a decision for later.
- **Colour contrast:** checked the status text colours against WCAG AA. The green
  was 4.52:1, just over the 4.5 minimum, so I darkened it to 5.58:1.

**Key learnings**
- Pure functions make the core rules testable without a database or a browser.
- Passing unit tests don't prove the output is *good*: try it on real data.
- An existing test can catch a fix that goes too far.

**Debugging: "I don't see the recovery data"**
- **Symptom:** after building the dashboard, the page didn't show the recovery tiles.
- **Hypotheses:** (1) looking at the live site, which doesn't have the new code yet;
  (2) an old browser tab from before switching branches; (3) a dev server started
  on another branch.
- **Tests:** confirmed the branch was `feature/recovery-dashboard`; the local API
  answered `/api/dashboard` with 401 (route exists) while the live API gave 404
  (not deployed yet). Loaded the page in headless Chrome against the test database:
  tiles, legend and suggestions all rendered. So the code was fine.
- **Fix:** it was hypothesis 2, a stale tab. A hard refresh (Ctrl+Shift+R) showed
  the dashboard.
- **Lesson:** before debugging code, check *which* version is running: branch,
  server, and the tab itself.

## Fri Oct 23 (afternoon): gym check-ins
- Recovery dashboard PR (#6) merged.
- **Built step 6** on `feature/gym-checkins`, working autonomously with Claude Code:
  CheckIn model, `POST /api/checkins` (verified within `CHECKIN_RADIUS_M`, default
  150 m; one verified check-in per day), `GET /api/checkins/summary`, pure functions
  for streaks and weekly progress (test-first), a `useGeolocation` hook, a Check-in
  page, and a one-tap "Use my current location" in Settings. 46 new tests; 164 pass.
- **Time zone decision:** the browser sends its time zone; each check-in stores the
  local calendar date it happened on. Streaks and weeks are calendar maths on those
  dates, so daylight saving can't shift a day. Tested with Kiritimati (UTC+14) and
  Pago Pago (UTC−11), which are always on different dates.
- **Proving the database rule, not just the test.** The "two check-ins at the same
  moment" test passed, but the service also looks for an existing check-in first, so
  the test alone didn't show the unique index works. Temporarily switched the lookup
  off (on a backup copy) and ran the tests: still only one counted, so the index
  does the job by itself. Restored the file and checked it was byte-for-byte the same.
- **Testing location in a real browser.** Headless Chrome can fake a position and
  grant or deny the location permission. Ran three scenarios against the test
  database: checking in 56 m away (verified, streak 0 → 1), Settings with permission
  denied (friendly "blocked" message), and saving a new gym location (saved, and the
  API confirmed it).
- **Bugs the screenshots caught:** (1) the navbar ran off the screen on phones once
  the sixth link was added: links now wrap; (2) two success messages showed at once
  after checking in; (3) my first fix for that brought back the Check in button,
  inviting a pointless second tap. Now: no button once you've checked in today.

**Key learnings**
- Store the user's local date at the moment it happens; don't recompute "days" later.
- To prove a safety net works, switch off the other safety net and test again.
- Look at the page, not just the test output: layout bugs don't fail tests.

## Fri Oct 23 (late afternoon): progress charts
- **Built step 7** on `feature/progress-charts`. It's stacked on
  `feature/gym-checkins` (not branched from `main`) because the check-in chart
  needs the CheckIn model, which isn't in `main` until that PR merges.
- Three endpoints (`/api/progress/...`) and pure functions for the chart data
  (test-first), plus a Progress page with Recharts: heaviest weight per session for
  a chosen exercise, and verified check-ins per week with the goal line. 24 new
  tests; 188 pass.
- **Picked a Recharts version on purpose.** The registry showed a recent date for
  3.10.1, so I checked the release history before installing: it was published in
  July, and the recent date was a metadata update. Installed 3.10.1; no known
  vulnerabilities in production dependencies.
- **Lazy-loaded the Progress page,** so the chart library (about 110 kB gzipped)
  only downloads when someone opens it. The build output confirmed a separate chunk.
- **Screenshots found four chart problems no test would:** (1) the weight axis
  started at 0, which flattened 55 → 65 kg into an almost-straight line; (2) the
  bar chart's count axis showed 0, 2, 4, 5; (3) week labels ran into each other on a
  phone; (4) once the weight axis fitted the data, Recharts chose uneven ticks
  (45, 52, 59, 66). Fixes: a fitted weight axis with even 5/10/25 kg steps, whole-
  number ticks, letting Recharts skip labels when space is tight, and the goal
  label moved into the margin so bars can't cover it.
- **Honest time:** sessions were evenly spaced whatever the gap between them, and the
  curved line suggested weights between sessions. Switched to a real time axis and
  straight segments; a test session 4 weeks earlier now shows as a visible gap.
- **Checked the hover tooltips** by simulating the mouse in headless Chrome:
  "Week of Oct 19 / 2 of 3 check-ins" and "Thu, Oct 22, 2026 / 65 kg × 5".

**Key learnings**
- Line charts show change, so they don't have to start at 0; bar charts do.
- An evenly spaced category axis quietly misrepresents irregular dates.
- Check a dependency's actual publish date and audit it before installing.

**Debugging: signup race condition (`fix/signup-race-condition`)**
- **Symptom:** two signups with the same email at almost the same moment (e.g. a
  double-click) could give the second one a 500 instead of a friendly 409.
- **Hypothesis:** both requests pass the "does this email exist?" check before
  either saves; the unique index on `email` then rejects the second with a
  duplicate key error, which the error handler treats as unexpected (500).
- **Test:** wrote a test that sends two identical signups at once. It failed about
  half the time (a race: it depends on which request finishes hashing first), and
  a failing run showed `[201, 500]` with `E11000 duplicate key ... email_1` in the log.
- **Fix:** catch error code 11000 around `User.create` and turn it into the same
  409 message as the normal duplicate check. The test then passed 10 of 10 runs.
- **Lesson:** a check-then-save is never enough on its own; the database's unique
  index is the real guarantee, so handle its error too. Same pattern as check-ins.

## Fri Oct 23 (evening): rate limiting
- All three PRs (#7 check-ins, #8 progress charts, #9 signup fix) merged. A notes
  conflict resolved with "Accept Incoming" dropped the signup race story; restored
  it from the original commit. Next time: "Accept Both" for notes.
- **Built login and signup rate limiting** on `feature/rate-limiting`
  (express-rate-limit 8.7.1): 10 failed logins per 15 minutes and 20 signups per
  hour per IP, with a friendly 429. 6 new tests; 195 pass.
- **The proxy problem.** On Render every request comes through Render's proxy, so
  without configuration all users would share one IP and one limit. Added
  `TRUST_PROXY` (set to 1 on Render). Trusting too many proxies would let anyone
  fake their IP, so it's a number, not "trust everything". The tests use
  `X-Forwarded-For` with `TRUST_PROXY=1` to give each test its own IP, which also
  checks the setting works.
- **Keeping the rest of the tests unthrottled:** the existing tests sign up hundreds
  of users. Limits are configurable through optional env vars; `setupEnv.js` raises
  them, and the rate-limit test file sets tiny ones (Jest loads the app separately
  per test file).
- **npm audit found a high-severity issue** in body-parser (which Express uses for
  every request). It already existed before this branch. `npm audit fix` (not
  `--force`) updated only the lockfile, 2.3.0 → 2.4.0; 0 vulnerabilities now.
  The install also warned about blocked install scripts: both were internal Jest
  packages, so I left them blocked.
- **Caught an unwanted change:** Prettier reformatted my CORS code in `app.js`
  while I was formatting the files I'd edited. Reverted that part so the commit only
  contains the rate-limit change.

**Key learnings**
- Behind a proxy, `req.ip` is the proxy unless you tell Express how many to trust.
- Read `npm audit` output before fixing: check what's affected and that it's not `--force`.
- Review the diff before committing; formatters can change more than you meant.
