const request = require('supertest');
const app = require('../src/app');
const Exercise = require('../src/models/Exercise');
const User = require('../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

let alice;
let bob;
let ex; // exercises by name

beforeAll(connectTestDB);
beforeEach(async () => {
  const created = await Exercise.create([
    { name: 'Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'barbell' },
    { name: 'Push-up', muscleGroups: ['chest', 'triceps'], equipment: 'bodyweight' },
    { name: 'Barbell Row', muscleGroups: ['back'], equipment: 'barbell' },
    { name: 'Pull-up', muscleGroups: ['back', 'biceps'], equipment: 'bodyweight' },
    { name: 'Back Squat', muscleGroups: ['quads', 'glutes'], equipment: 'barbell' },
    { name: 'Bodyweight Squat', muscleGroups: ['quads', 'glutes'], equipment: 'bodyweight' },
    { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'barbell' },
    { name: 'Plank', muscleGroups: ['core'], equipment: 'bodyweight' },
    { name: 'Calf Raise', muscleGroups: ['calves'], equipment: 'bodyweight' },
    { name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'barbell' },
  ]);
  ex = Object.fromEntries(created.map((e) => [e.name, e]));
  alice = await signupAs('alice@example.com');
  bob = await signupAs('bob@example.com');
});
afterEach(clearTestDB);
afterAll(closeTestDB);

async function signupAs(email, extra = {}) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Lifter', email, password: 'password123', ...extra });
  return { token: res.body.token, id: res.body.user._id };
}

function logWorkout(who, date, ...exercises) {
  return request(app)
    .post('/api/workouts')
    .set('Authorization', `Bearer ${who.token}`)
    .send({ date, entries: exercises.map((e) => ({ exercise: e.id, sets: [{ reps: 5 }] })) });
}

const getDashboard = (who) =>
  request(app).get('/api/dashboard').set('Authorization', `Bearer ${who.token}`);

const byGroup = (recovery) => Object.fromEntries(recovery.map((r) => [r.muscleGroup, r]));

describe('GET /api/dashboard', () => {
  it('shows every muscle group as never trained for a new user', async () => {
    const res = await getDashboard(alice);

    expect(res.status).toBe(200);
    expect(res.body.recovery).toHaveLength(10);
    expect(res.body.recovery.every((r) => r.daysSince === null && r.status === 'neglected')).toBe(
      true,
    );
    expect(res.body.thresholds).toEqual({ recentMaxDays: 2, dueMaxDays: 5 });
  });

  it('suggests bodyweight exercises with the general rep range by default', async () => {
    const res = await getDashboard(alice);
    const { repRange, groups } = res.body.recommendations;

    expect(repRange).toEqual({ min: 10, max: 15 });
    expect(groups).toHaveLength(3);
    const suggested = groups.flatMap((g) => g.exercises);
    expect(suggested.every((e) => e.equipment === 'bodyweight')).toBe(true);
    expect(suggested[0]).toEqual(
      expect.objectContaining({ _id: expect.any(String), name: expect.any(String) }),
    );
  });

  it('works out recovery from the workouts the user logged', async () => {
    await logWorkout(alice, daysAgo(1), ex['Bench Press']);
    await logWorkout(alice, daysAgo(4), ex['Barbell Row']);
    await logWorkout(alice, daysAgo(8), ex['Back Squat']);

    const recovery = byGroup((await getDashboard(alice)).body.recovery);

    expect(recovery.chest).toMatchObject({ daysSince: 1, status: 'recent' });
    expect(recovery.triceps).toMatchObject({ daysSince: 1, status: 'recent' });
    expect(recovery.back).toMatchObject({ daysSince: 4, status: 'due' });
    expect(recovery.quads).toMatchObject({ daysSince: 8, status: 'neglected' });
    expect(recovery.calves).toMatchObject({ daysSince: null, status: 'neglected' });
  });

  it("uses the user's equipment and goal for recommendations", async () => {
    const strong = await signupAs('strong@example.com', {
      goal: 'strength',
      equipment: ['barbell'],
    });
    await logWorkout(strong, daysAgo(1), ex['Bench Press'], ex['Overhead Press']);

    const { repRange, groups } = (await getDashboard(strong)).body.recommendations;

    expect(repRange).toEqual({ min: 3, max: 6 });
    const suggested = groups.flatMap((g) => g.exercises);
    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested.every((e) => e.equipment === 'barbell')).toBe(true);
    // Chest, triceps and shoulders were trained yesterday, so they aren't suggested
    expect(groups.map((g) => g.muscleGroup)).not.toEqual(expect.arrayContaining(['chest']));
  });

  it("is not affected by another user's workouts", async () => {
    await logWorkout(bob, daysAgo(0), ex['Bench Press'], ex['Barbell Row']);

    const recovery = byGroup((await getDashboard(alice)).body.recovery);

    expect(recovery.chest.daysSince).toBeNull();
    expect(recovery.back.daysSince).toBeNull();
  });

  it('returns 404 if the account no longer exists', async () => {
    await User.findByIdAndDelete(alice.id);

    const res = await getDashboard(alice);

    expect(res.status).toBe(404);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(401);
  });
});
