# RepRadar Devlog

Weekly progress on RepRadar, a web app that helps gym-goers log workouts, see which
muscle groups they've been neglecting, get exercise suggestions, and build a habit
through location-verified gym check-ins.

Each entry starts with a plain-English summary, followed by the technical detail.

---

## Week 1 (Mon 5 – Sun 11 October 2026)

> **DRAFT — for review**

### Summary

This week I set up the foundations of RepRadar. There's nothing a user can see yet:
I created the project, started the server that the app will talk to, and connected
it to the online database where users' data will be kept. I also wrote a short guide
to how the code is organised, so it stays easy to find my way around as it grows.
The setup was done on 6 and 7 October; the features themselves are all still ahead.

### Progress against plan

My notes don't record a separate plan for this week. What got done:

| Done | Detail |
| --- | --- |
| Repository and folder structure | `client/`, `server/`, `docs/`, `notes/` |
| Express server | with a `/health` endpoint |
| Database connection | MongoDB Atlas, using Mongoose |
| Architecture document | request-flow section in `ARCHITECTURE.md` |

### Challenges and troubleshooting

None recorded in my notes for this week.

### Key learnings

- Keeping the Express app (`app.js`) separate from the code that starts the server
  (`server.js`) means tests can load the app without starting a real server.

### Screenshots

None for this week: there was no user interface yet.

### Code snippets

The first version of the app: a health check that hosting and the uptime monitor can call.

```js
// server/src/app.js (week 1)
const app = express();

app.use(express.json());

// Health check: Render and the uptime monitor call this to confirm the API is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
```

### Next week

Not recorded at the time. (Development then paused in week 2.)

---

## Week 2 (Mon 12 – Sun 18 October 2026)

> **DRAFT — for review**

Development paused this week for personal reasons.

---

## Week 3 (Mon 19 – Sun 25 October 2026)

> **DRAFT — for review** (drafted Friday 23 October; the week isn't over yet)

### Summary

This was the big building week. RepRadar now works from start to finish: people can
create an account, log their workouts from a library of 670 exercises, and see a
dashboard showing which muscle groups they've trained recently and which they've
neglected, with suggestions for what to do next. They can also check in at their gym
using their phone's location to build a streak, and follow their progress on charts.
After a break, I asked for an extension and worked faster to catch up. All seven
planned features are now built and live. The main risk is time: the final polish
(more testing, phone and browser checks, and the README) still needs to be done.

### Progress against plan

At the start of the week, user accounts existed only on the server. The plan was the
seven MVP features from the proposal, then hardening and deliverables.

| Planned | Status |
| --- | --- |
| Accounts on the server (sign up, log in, protected routes) | ✅ done, with tests, deployed on Render |
| 1. Login and signup pages, settings, deploy the frontend | ✅ live on Vercel |
| 2. Exercise library (wger data, search and filters) | ✅ 670 exercises |
| 3. Workout logging (log, history, edit, delete) | ✅ |
| 4. Core logic: recovery, recommendations, distance | ✅ pure functions, written test-first |
| 5. Recovery dashboard | ✅ |
| 6. Gym check-ins with streaks and weekly goal | ✅ |
| 7. Progress charts | ✅ |
| 8. Hardening and deliverables | 🟡 started: rate limiting on login and signup done |

By the numbers: 81 commits, 10 pull requests merged, and 195 server tests. I built
most of this with Claude Code as an AI pair programmer. I set the plan and rules in
`CLAUDE.md`, reviewed the work, tested it in the browser, and made the decisions on
scope.

**Still to do (step 8):** client-side tests, responsive and cross-browser checks
(including Safari on an iPhone), an uptime monitor, and the README.

### Challenges and troubleshooting

**1. All the database tests failed at once.**
- *Symptom:* all 9 database tests failed, with a mix of different errors.
- *What I suspected:* one root cause, not nine separate problems.
- *How I tested it:* I read the *first* error rather than the last. It was
  `Missing required sub-document 'driver'`, a version mismatch between the MongoDB
  driver and the in-memory test database. The `buffering timed out` errors after it
  were knock-on effects: Mongoose was waiting for a connection that never came.
- *The fix:* pinning the in-memory server's version didn't help, so I switched to a
  separate `repradar-test` database on Atlas, with a safety check so tests can never
  run against real data.

**2. The browser was blocked by CORS, but curl worked.**
- *Symptom:* the frontend's requests failed with a CORS error, while the same
  request from curl succeeded.
- *What I suspected:* CORS is enforced by browsers, not servers. A request with an
  `Authorization` header first sends a "preflight" check, which the API had to approve.
- *How I tested it:* I sent a fake preflight with `curl -i -X OPTIONS`. The response
  had `Access-Control-Allow-Headers` but not `Allow-Origin`, so CORS was running but
  rejecting my frontend's address.
- *The fix:* I cleaned up the list of allowed addresses defensively (stray spaces,
  quotes, trailing slashes, hidden Windows line endings), and made sure CORS runs
  before the routes.

**3. Saving the wrong day.**
- *Symptom (caught before it reached users):* a workout logged for 23 October would
  have been saved and shown as 22 October.
- *What I suspected:* a date picker gives `2026-10-23`, and JavaScript reads that as
  midnight UTC, which is still the 22nd in Vancouver (UTC−7).
- *How I tested it:* I compared that naive approach with saving the day at 12:00
  local time, in four time zones. The naive version showed the day before in
  Vancouver; noon kept the right day in all four.
- *The fix:* workouts are saved at local noon. For check-ins, I store the user's own
  calendar date at the moment they check in, so streaks can't be shifted by time
  zones or daylight saving.

**4. Passing tests, but bad suggestions.**
- *Symptom:* after all the recommendation tests passed, I tried them on the real 670
  exercises. Biceps got "Alternating bicep curls", "Alternating Biceps Curls With
  Dumbbell" and "Alternating Dumbbell Curl": three copies of one exercise.
- *What I suspected:* sorting alphabetically was picking the exercise database's
  duplicate entries.
- *How I tested it:* I wrote a test with those real names and watched it fail.
- *The fix:* skip an exercise if it uses the same equipment and mostly the same words
  as one already chosen. My first version would also have merged two genuinely
  different leg curls, but an existing test caught it. I also excluded stretches.

**5. Two clicks, one crash: a race condition.**
- *Symptom:* two signups with the same email at almost the same moment (like a
  double-click) could give the second one a server error (500) instead of a friendly
  "this email is already registered" (409).
- *What I suspected:* both requests pass the "does this email exist?" check before
  either saves. The database's unique index then blocks the second, and that database
  error wasn't being handled.
- *How I tested it:* a test that sends two identical signups at once. It failed about
  half the time, which is typical of a race, and a failing run showed `E11000
  duplicate key` in the log.
- *The fix:* turn that database error into the normal 409 message. The test then
  passed 10 out of 10 times. I'd already used the same approach for "one check-in per
  day", where I proved the database rule works on its own by temporarily switching
  off the code-level check.

**6. "I don't see the recovery data."**
- *Symptom:* after building the dashboard, it didn't show the recovery tiles.
- *What I suspected:* (1) the live site, which didn't have the new code yet; (2) an
  old browser tab from before I switched branches; (3) a server started on another branch.
- *How I tested it:* the local API had the new route (it answered 401, "log in"),
  while the live API answered 404. Loading the page in a headless browser showed the
  dashboard working, so the code was fine.
- *The fix:* it was the old tab: a hard refresh (Ctrl+Shift+R) fixed it. Before
  debugging code, check *which version* is actually running.

### Key learnings

- When many things fail at once, read the first error: the rest are often symptoms.
- CORS is a browser rule, so test it with a real preflight, not a normal request.
- Scope every database query to the logged-in user, and test that another user's
  data can't be read, changed or deleted.
- A check-then-save isn't enough by itself: the database's unique index is the real
  guarantee, so handle its error too.
- Dates without a time zone need a deliberate decision about how they're stored.
- Passing unit tests don't prove the results are good: try the code on real data.
- Look at the page itself: screenshots caught layout bugs no test would (a navbar
  running off a phone screen, a chart axis that flattened real progress).
- Watch a new test fail first, and check *why* it fails: a missing route also returns
  404, which made one test pass for the wrong reason.

### Screenshots

*To be added: these files don't exist yet (see the list below).*

![Recovery dashboard](docs/screenshots/week3-dashboard.png)
![Logging a workout](docs/screenshots/week3-log-workout.png)
![Gym check-in on a phone](docs/screenshots/week3-checkin-mobile.png)
![Progress charts](docs/screenshots/week3-progress-charts.png)
![Field-level errors on signup](docs/screenshots/week3-signup-errors.png)
![CI passing on a pull request](docs/screenshots/week3-ci-passing.png)

### Code snippets

Every workout query includes the logged-in user, so nobody can reach someone else's
workout. Another user's workout gets the same 404 as one that doesn't exist:

```js
// server/src/services/workoutService.js
async function getWorkout(userId, workoutId) {
  const workout = await Workout.findOne({ _id: workoutId, user: userId }).populate(WITH_EXERCISES);
  if (!workout) {
    throw new AppError(404, 'Workout not found');
  }
  return workout;
}
```

"One verified check-in per day" is a database rule, not just a check in the code, so
two taps at the same moment can't both count:

```js
// server/src/models/CheckIn.js
checkInSchema.index(
  { user: 1, localDate: 1 },
  { unique: true, partialFilterExpression: { verified: true } },
);
```

Counting days since a muscle group was trained, without the server knowing the
user's time zone:

```js
// server/src/utils/recovery.js
// Workouts are saved at 12:00 local time, so rounding the time since then
// gives exactly the calendar-day difference in the user's own time zone.
function daysBetween(earlier, now) {
  return Math.max(0, Math.round((now.getTime() - earlier.getTime()) / DAY_MS));
}
```

### Next week

Finish step 8 and submit:
- Client tests with Vitest and React Testing Library for the key forms and the
  dashboard, plus a client job in CI. (The proposal said Jest; Vitest is Vite's
  standard test tool with the same style of API.)
- Responsive and cross-browser checks, including Safari on a real iPhone.
- An uptime monitor on `/health`.
- The README, including a note on AI-assisted development.
