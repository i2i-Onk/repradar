const { recommendExercises } = require('../src/utils/recommendations');

// A recovery row, as calculateRecovery returns it
const row = (muscleGroup, daysSince, status) => ({
  muscleGroup,
  lastTrained: null,
  daysSince,
  status,
});

// Never trained: hamstrings, then core. Then back (7 days), shoulders (4), chest (1, recent).
const recovery = [
  row('chest', 1, 'recent'),
  row('back', 7, 'neglected'),
  row('shoulders', 4, 'due'),
  row('hamstrings', null, 'neglected'),
  row('core', null, 'neglected'),
];

let nextId = 1;
const exercise = (name, muscleGroups, equipment) => ({
  _id: String(nextId++),
  name,
  muscleGroups,
  equipment,
});

const library = [
  exercise('Romanian Deadlift', ['hamstrings', 'glutes', 'back'], 'barbell'),
  exercise('Lying Leg Curl', ['hamstrings'], 'machine'),
  exercise('Nordic Curl', ['hamstrings'], 'bodyweight'),
  exercise('Dumbbell Leg Curl', ['hamstrings'], 'dumbbell'),
  exercise('Good Morning', ['hamstrings', 'back'], 'barbell'),
  exercise('Plank', ['core'], 'bodyweight'),
  exercise('Dead Bug', ['core'], 'bodyweight'),
  exercise('Ab Wheel', ['core'], 'bodyweight'),
  exercise('Hanging Leg Raise', ['core'], 'bodyweight'),
  exercise('Pull-up', ['back', 'biceps'], 'bodyweight'),
  exercise('Barbell Row', ['back'], 'barbell'),
  exercise('Overhead Press', ['shoulders', 'triceps'], 'barbell'),
  exercise('Push-up', ['chest', 'triceps'], 'bodyweight'),
];

const names = (group) => group.exercises.map((e) => e.name);

function recommend(overrides = {}) {
  return recommendExercises({
    recovery,
    exercises: library,
    equipment: ['bodyweight', 'barbell', 'dumbbell', 'machine'],
    goal: 'general',
    ...overrides,
  });
}

describe('recommendExercises', () => {
  it('suggests the 3 most neglected muscle groups, most neglected first', () => {
    const { groups } = recommend();

    expect(groups.map((g) => g.muscleGroup)).toEqual(['hamstrings', 'core', 'back']);
    expect(groups[2]).toMatchObject({ daysSince: 7, status: 'neglected' });
  });

  it('suggests up to 3 exercises per group, focused ones first, then by name', () => {
    const { groups } = recommend();

    // Single-group exercises come before Good Morning (2 groups) and Romanian Deadlift (3)
    expect(names(groups[0])).toEqual(['Dumbbell Leg Curl', 'Lying Leg Curl', 'Nordic Curl']);
    expect(names(groups[1])).toEqual(['Ab Wheel', 'Dead Bug', 'Hanging Leg Raise']);
  });

  it('only suggests exercises for equipment the user has', () => {
    const { groups } = recommend({ equipment: ['bodyweight'] });

    expect(names(groups[0])).toEqual(['Nordic Curl']);
    expect(groups.flatMap((g) => g.exercises).every((e) => e.equipment === 'bodyweight')).toBe(
      true,
    );
  });

  it('never suggests the same exercise for two groups', () => {
    const { groups } = recommend({ equipment: ['barbell'] });
    const ids = groups.flatMap((g) => g.exercises.map((e) => e._id));

    // Good Morning and Romanian Deadlift train both hamstrings and back
    expect(names(groups[0])).toEqual(['Good Morning', 'Romanian Deadlift']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skips a group with no usable exercises and moves on to the next', () => {
    // With barbell only, core has nothing, so shoulders (4 days) takes its place
    const { groups } = recommend({ equipment: ['barbell'] });

    expect(groups.map((g) => g.muscleGroup)).toEqual(['hamstrings', 'back', 'shoulders']);
  });

  it('never suggests a group trained in the last couple of days', () => {
    const { groups } = recommend({
      recovery: [row('chest', 1, 'recent'), row('back', 7, 'neglected')],
    });

    expect(groups.map((g) => g.muscleGroup)).toEqual(['back']);
  });

  it('suggests nothing when the user has no equipment selected', () => {
    expect(recommend({ equipment: [] }).groups).toEqual([]);
  });

  it.each([
    ['strength', { min: 3, max: 6 }],
    ['hypertrophy', { min: 8, max: 12 }],
    ['general', { min: 10, max: 15 }],
  ])('suggests the %s rep range', (goal, repRange) => {
    expect(recommend({ goal }).repRange).toEqual(repRange);
  });

  it('falls back to the general rep range for an unknown goal', () => {
    expect(recommend({ goal: 'flying' }).repRange).toEqual({ min: 10, max: 15 });
  });
});
