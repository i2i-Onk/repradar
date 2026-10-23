const request = require('supertest');
const app = require('../src/app');
const Exercise = require('../src/models/Exercise');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const sampleExercises = [
  { name: 'Barbell Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'barbell' },
  { name: 'Incline Dumbbell Bench Press', muscleGroups: ['chest'], equipment: 'dumbbell' },
  { name: 'Push-up', muscleGroups: ['chest', 'triceps'], equipment: 'bodyweight' },
  { name: 'Back Squat', muscleGroups: ['quads', 'glutes'], equipment: 'barbell' },
  { name: 'Plank', muscleGroups: ['core'], equipment: 'bodyweight' },
];

let token;

beforeAll(connectTestDB);
beforeEach(async () => {
  await Exercise.create(sampleExercises);
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Lifter', email: 'lifter@example.com', password: 'password123' });
  token = signup.body.token;
});
afterEach(clearTestDB);
afterAll(closeTestDB);

// GET /api/exercises with the given query string, logged in
function getExercises(query = '') {
  return request(app).get(`/api/exercises${query}`).set('Authorization', `Bearer ${token}`);
}

const names = (res) => res.body.exercises.map((exercise) => exercise.name);

describe('GET /api/exercises', () => {
  it('lists all exercises sorted by name, with a total', async () => {
    const res = await getExercises();

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(names(res)).toEqual([
      'Back Squat',
      'Barbell Bench Press',
      'Incline Dumbbell Bench Press',
      'Plank',
      'Push-up',
    ]);
  });

  it('searches names by partial, case-insensitive text', async () => {
    const res = await getExercises('?search=BENCH');

    expect(names(res)).toEqual(['Barbell Bench Press', 'Incline Dumbbell Bench Press']);
  });

  it('filters by muscle group', async () => {
    const res = await getExercises('?muscle=triceps');

    expect(names(res)).toEqual(['Barbell Bench Press', 'Push-up']);
  });

  it('filters by equipment', async () => {
    const res = await getExercises('?equipment=bodyweight');

    expect(names(res)).toEqual(['Plank', 'Push-up']);
  });

  it('combines search and filters', async () => {
    const res = await getExercises('?search=press&muscle=chest&equipment=barbell');

    expect(names(res)).toEqual(['Barbell Bench Press']);
  });

  it('limits the number of results but still reports the full total', async () => {
    const res = await getExercises('?limit=2');

    expect(res.body.exercises).toHaveLength(2);
    expect(res.body.total).toBe(5);
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await getExercises('?search=zzz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exercises: [], total: 0 });
  });

  it('treats regex characters in the search as plain text', async () => {
    const res = await getExercises('?search=' + encodeURIComponent('(.*'));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('rejects an unknown muscle group, equipment or limit with 400', async () => {
    const res = await getExercises('?muscle=wings&equipment=rocket&limit=500');

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((error) => error.field);
    expect(fields).toEqual(expect.arrayContaining(['muscle', 'equipment', 'limit']));
  });

  it('does not expose the internal wger id', async () => {
    await Exercise.create({
      name: 'Zercher Squat',
      muscleGroups: ['quads'],
      equipment: 'barbell',
      wgerId: 42,
    });

    const res = await getExercises('?search=zercher');

    expect(res.body.exercises[0].wgerId).toBeUndefined();
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/exercises');

    expect(res.status).toBe(401);
  });
});
