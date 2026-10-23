const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const CheckIn = require('../src/models/CheckIn');
const Exercise = require('../src/models/Exercise');
const { addDays, localDateIn, startOfWeek } = require('../src/utils/checkinDays');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const TZ = 'America/Vancouver';
let alice;
let bob;
let bench;
let squat;

beforeAll(connectTestDB);
beforeEach(async () => {
  [bench, squat] = await Exercise.create([
    { name: 'Bench Press', muscleGroups: ['chest'], equipment: 'barbell' },
    { name: 'Back Squat', muscleGroups: ['quads'], equipment: 'barbell' },
  ]);
  alice = await signup('alice@example.com', 4);
  bob = await signup('bob@example.com', 3);
});
afterEach(clearTestDB);
afterAll(closeTestDB);

async function signup(email, weeklyGoal) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Lifter', email, password: 'password123' });
  const who = { token: res.body.token, id: res.body.user._id };
  await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${who.token}`)
    .send({ weeklyGoal });
  return who;
}

function logWorkout(who, date, exercise, sets) {
  return request(app)
    .post('/api/workouts')
    .set('Authorization', `Bearer ${who.token}`)
    .send({ date, entries: [{ exercise: exercise.id, sets }] });
}

const get = (who, path) => request(app).get(path).set('Authorization', `Bearer ${who.token}`);

describe('GET /api/progress/exercises', () => {
  it('lists only the exercises this user has logged', async () => {
    await logWorkout(alice, '2026-10-01T12:00:00Z', bench, [{ reps: 5, weight: 60 }]);
    await logWorkout(alice, '2026-10-03T12:00:00Z', bench, [{ reps: 5, weight: 62.5 }]);
    await logWorkout(bob, '2026-10-02T12:00:00Z', squat, [{ reps: 5, weight: 100 }]);

    const res = await get(alice, '/api/progress/exercises');

    expect(res.status).toBe(200);
    expect(res.body.exercises).toEqual([{ _id: bench.id, name: 'Bench Press', sessions: 2 }]);
  });

  it('is empty for a user with no workouts', async () => {
    const res = await get(alice, '/api/progress/exercises');

    expect(res.body.exercises).toEqual([]);
  });

  it('rejects a request with no token', async () => {
    expect((await request(app).get('/api/progress/exercises')).status).toBe(401);
  });
});

describe('GET /api/progress/exercises/:exerciseId', () => {
  it("gives this user's heaviest set per session, oldest first", async () => {
    await logWorkout(alice, '2026-10-05T12:00:00Z', bench, [
      { reps: 5, weight: 62.5 },
      { reps: 3, weight: 67.5 },
    ]);
    await logWorkout(alice, '2026-10-01T12:00:00Z', bench, [{ reps: 5, weight: 60 }]);
    await logWorkout(bob, '2026-10-03T12:00:00Z', bench, [{ reps: 1, weight: 140 }]);

    const res = await get(alice, `/api/progress/exercises/${bench.id}`);

    expect(res.status).toBe(200);
    expect(res.body.exercise).toEqual({ _id: bench.id, name: 'Bench Press' });
    expect(res.body.points.map((p) => [p.date, p.weight, p.reps])).toEqual([
      ['2026-10-01T12:00:00.000Z', 60, 5],
      ['2026-10-05T12:00:00.000Z', 67.5, 3],
    ]);
  });

  it('returns no points for an exercise this user has not logged', async () => {
    await logWorkout(bob, '2026-10-03T12:00:00Z', squat, [{ reps: 5, weight: 100 }]);

    const res = await get(alice, `/api/progress/exercises/${squat.id}`);

    expect(res.status).toBe(200);
    expect(res.body.points).toEqual([]);
  });

  it('returns 404 for an exercise that is not in the library', async () => {
    const res = await get(alice, `/api/progress/exercises/${new mongoose.Types.ObjectId()}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await get(alice, '/api/progress/exercises/not-an-id');

    expect(res.status).toBe(400);
  });

  it('rejects a request with no token', async () => {
    expect((await request(app).get(`/api/progress/exercises/${bench.id}`)).status).toBe(401);
  });
});

describe('GET /api/progress/checkins', () => {
  const saved = (who, localDate, verified = true) =>
    CheckIn.create({
      user: who.id,
      coordinates: { lat: 0, lng: 0 },
      distance: 10,
      verified,
      localDate,
      timeZone: TZ,
    });

  it("counts this user's verified check-ins per week for 8 weeks, with the goal", async () => {
    const thisWeek = startOfWeek(localDateIn(new Date(), TZ));
    await saved(alice, thisWeek);
    await saved(alice, addDays(thisWeek, -7));
    await saved(alice, addDays(thisWeek, -6)); // also last week
    await saved(alice, addDays(thisWeek, -5), false); // too far: not counted
    await saved(bob, thisWeek); // someone else

    const res = await get(alice, `/api/progress/checkins?timeZone=${encodeURIComponent(TZ)}`);

    expect(res.status).toBe(200);
    expect(res.body.weeklyGoal).toBe(4);
    expect(res.body.weeks).toHaveLength(8);
    expect(res.body.weeks[7]).toEqual({ weekStart: thisWeek, count: 1 });
    expect(res.body.weeks[6]).toEqual({ weekStart: addDays(thisWeek, -7), count: 2 });
    expect(res.body.weeks.slice(0, 6).every((w) => w.count === 0)).toBe(true);
  });

  it('requires a valid time zone', async () => {
    const res = await get(alice, '/api/progress/checkins?timeZone=Mars%2FOlympus');

    expect(res.status).toBe(400);
  });

  it('rejects a request with no token', async () => {
    expect((await request(app).get(`/api/progress/checkins?timeZone=${TZ}`)).status).toBe(401);
  });
});
