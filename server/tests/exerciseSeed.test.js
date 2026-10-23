const Exercise = require('../src/models/Exercise');
const { upsertExercises } = require('../src/services/exerciseService');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const benchPress = {
  wgerId: 1,
  name: 'Bench Press',
  muscleGroups: ['chest'],
  equipment: 'barbell',
  description: 'Press the bar.',
};
const squat = {
  wgerId: 2,
  name: 'Squat',
  muscleGroups: ['quads', 'glutes'],
  equipment: 'barbell',
  description: '',
};

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('upsertExercises (used by the seed script)', () => {
  it('inserts new exercises', async () => {
    const result = await upsertExercises([benchPress, squat]);

    expect(result).toEqual({ inserted: 2, updated: 0, unchanged: 0 });
    expect(await Exercise.countDocuments()).toBe(2);
    const saved = await Exercise.findOne({ wgerId: 1 });
    expect(saved.createdAt).toBeInstanceOf(Date);
  });

  it('creates no duplicates when run twice with the same data', async () => {
    await upsertExercises([benchPress, squat]);
    const secondRun = await upsertExercises([benchPress, squat]);

    expect(secondRun).toEqual({ inserted: 0, updated: 0, unchanged: 2 });
    expect(await Exercise.countDocuments()).toBe(2);
  });

  it('updates an exercise in place when wger changes it', async () => {
    await upsertExercises([benchPress]);
    const result = await upsertExercises([{ ...benchPress, name: 'Barbell Bench Press' }]);

    expect(result).toEqual({ inserted: 0, updated: 1, unchanged: 0 });
    const saved = await Exercise.find();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Barbell Bench Press');
  });

  it('leaves exercises that are not in the list alone', async () => {
    await Exercise.create({ name: 'My Custom Move', muscleGroups: ['core'], equipment: 'band' });
    await upsertExercises([benchPress]);

    expect(await Exercise.countDocuments()).toBe(2);
  });
});
