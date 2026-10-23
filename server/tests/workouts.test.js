const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Exercise = require('../src/models/Exercise');
const Workout = require('../src/models/Workout');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

let alice; // { token, id }
let bob;
let benchPress;
let squat;

beforeAll(connectTestDB);
beforeEach(async () => {
  [benchPress, squat] = await Exercise.create([
    { name: 'Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'barbell' },
    { name: 'Squat', muscleGroups: ['quads', 'glutes'], equipment: 'barbell' },
  ]);
  alice = await signupAs('alice@example.com');
  bob = await signupAs('bob@example.com');
});
afterEach(clearTestDB);
afterAll(closeTestDB);

async function signupAs(email) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Lifter', email, password: 'password123' });
  return { token: res.body.token, id: res.body.user._id };
}

function validWorkout(overrides = {}) {
  return {
    date: '2026-10-20T12:00:00.000Z',
    entries: [
      {
        exercise: benchPress.id,
        sets: [
          { reps: 8, weight: 60 },
          { reps: 6, weight: 65 },
        ],
      },
    ],
    ...overrides,
  };
}

// Small helpers so each test reads as "who does what"
const as = (who) => ({
  create: (body) =>
    request(app).post('/api/workouts').set('Authorization', `Bearer ${who.token}`).send(body),
  list: (query = '') =>
    request(app).get(`/api/workouts${query}`).set('Authorization', `Bearer ${who.token}`),
  get: (id) => request(app).get(`/api/workouts/${id}`).set('Authorization', `Bearer ${who.token}`),
  update: (id, body) =>
    request(app).put(`/api/workouts/${id}`).set('Authorization', `Bearer ${who.token}`).send(body),
  remove: (id) =>
    request(app).delete(`/api/workouts/${id}`).set('Authorization', `Bearer ${who.token}`),
});

const fieldsOf = (res) => res.body.errors.map((error) => error.field);

describe('POST /api/workouts', () => {
  it('creates a workout for the logged-in user, with exercise details filled in', async () => {
    const res = await as(alice).create(validWorkout());

    expect(res.status).toBe(201);
    expect(res.body.workout.user).toBe(alice.id);
    expect(res.body.workout.date).toBe('2026-10-20T12:00:00.000Z');
    expect(res.body.workout.entries[0].exercise.name).toBe('Bench Press');
    expect(res.body.workout.entries[0].sets).toEqual([
      { reps: 8, weight: 60 },
      { reps: 6, weight: 65 },
    ]);
  });

  it('ignores a user id sent in the body', async () => {
    const res = await as(alice).create(validWorkout({ user: bob.id }));

    expect(res.body.workout.user).toBe(alice.id);
  });

  it('treats a missing weight as 0 (bodyweight)', async () => {
    const res = await as(alice).create(
      validWorkout({ entries: [{ exercise: squat.id, sets: [{ reps: 20 }] }] }),
    );

    expect(res.status).toBe(201);
    expect(res.body.workout.entries[0].sets[0]).toEqual({ reps: 20, weight: 0 });
  });

  it('rejects invalid sets with 400 and names each problem field', async () => {
    const res = await as(alice).create(
      validWorkout({
        entries: [
          { exercise: 'not-an-id', sets: [{ reps: 0, weight: -5 }] },
          { exercise: squat.id, sets: [] },
        ],
      }),
    );

    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toEqual(
      expect.arrayContaining([
        'entries[0].exercise',
        'entries[0].sets[0].reps',
        'entries[0].sets[0].weight',
        'entries[1].sets',
      ]),
    );
  });

  it('rejects a workout with no exercises', async () => {
    const res = await as(alice).create(validWorkout({ entries: [] }));

    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('entries');
  });

  it('rejects a date in the future', async () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await as(alice).create(validWorkout({ date: nextWeek }));

    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain('date');
  });

  it('rejects an exercise id that is not in the library', async () => {
    const unknownId = new mongoose.Types.ObjectId().toString();
    const res = await as(alice).create(
      validWorkout({ entries: [{ exercise: unknownId, sets: [{ reps: 5 }] }] }),
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/exercise/i);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).post('/api/workouts').send(validWorkout());

    expect(res.status).toBe(401);
  });
});

describe('GET /api/workouts', () => {
  it("lists only the logged-in user's workouts, newest first", async () => {
    await as(alice).create(validWorkout({ date: '2026-10-18T12:00:00.000Z' }));
    await as(alice).create(validWorkout({ date: '2026-10-20T12:00:00.000Z' }));
    await as(bob).create(validWorkout());

    const res = await as(alice).list();

    expect(res.status).toBe(200);
    expect(res.body.workouts.map((w) => w.date)).toEqual([
      '2026-10-20T12:00:00.000Z',
      '2026-10-18T12:00:00.000Z',
    ]);
    expect(res.body.workouts.every((w) => w.user === alice.id)).toBe(true);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/workouts');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/workouts/:id', () => {
  it('returns one of your own workouts', async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(alice).get(created.body.workout._id);

    expect(res.status).toBe(200);
    expect(res.body.workout.entries[0].exercise.name).toBe('Bench Press');
  });

  it("returns 404 for another user's workout", async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(bob).get(created.body.workout._id);

    expect(res.status).toBe(404);
  });

  it('returns 404 for a workout that does not exist', async () => {
    const res = await as(alice).get(new mongoose.Types.ObjectId().toString());

    expect(res.status).toBe(404);
  });

  it('returns 400 for an id that is not valid', async () => {
    const res = await as(alice).get('not-an-id');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/workouts/:id', () => {
  it('replaces the date and exercises of your own workout', async () => {
    const created = await as(alice).create(validWorkout());
    const changes = {
      date: '2026-10-21T12:00:00.000Z',
      entries: [{ exercise: squat.id, sets: [{ reps: 5, weight: 100 }] }],
    };

    const res = await as(alice).update(created.body.workout._id, changes);

    expect(res.status).toBe(200);
    expect(res.body.workout.date).toBe(changes.date);
    expect(res.body.workout.entries).toHaveLength(1);
    expect(res.body.workout.entries[0].exercise.name).toBe('Squat');
  });

  it('rejects invalid changes with 400', async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(alice).update(created.body.workout._id, validWorkout({ entries: [] }));

    expect(res.status).toBe(400);
  });

  it("cannot edit another user's workout", async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(bob).update(
      created.body.workout._id,
      validWorkout({ entries: [{ exercise: squat.id, sets: [{ reps: 1, weight: 1 }] }] }),
    );

    expect(res.status).toBe(404);
    const saved = await Workout.findById(created.body.workout._id);
    expect(saved.entries[0].exercise.toString()).toBe(benchPress.id);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app)
      .put(`/api/workouts/${new mongoose.Types.ObjectId()}`)
      .send(validWorkout());

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/workouts/:id', () => {
  it('deletes your own workout', async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(alice).remove(created.body.workout._id);

    expect(res.status).toBe(204);
    expect(await Workout.findById(created.body.workout._id)).toBeNull();
  });

  it("cannot delete another user's workout", async () => {
    const created = await as(alice).create(validWorkout());

    const res = await as(bob).remove(created.body.workout._id);

    expect(res.status).toBe(404);
    expect(await Workout.findById(created.body.workout._id)).not.toBeNull();
  });

  it('returns 404 for a workout that does not exist', async () => {
    const res = await as(alice).remove(new mongoose.Types.ObjectId().toString());

    expect(res.status).toBe(404);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).delete(`/api/workouts/${new mongoose.Types.ObjectId()}`);

    expect(res.status).toBe(401);
  });
});
