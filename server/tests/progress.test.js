const { heaviestPerSession, loggedExercises } = require('../src/utils/progress');
const { weeklyCounts } = require('../src/utils/checkinDays');

const bench = { _id: 'e1', name: 'Bench Press' };
const squat = { _id: 'e2', name: 'Back Squat' };

const workout = (id, date, ...entries) => ({ _id: id, date: new Date(date), entries });
const entry = (exercise, ...sets) => ({
  exercise,
  sets: sets.map(([reps, weight]) => ({ reps, weight })),
});

describe('loggedExercises', () => {
  it('lists each exercise the user logged once, by name, with a session count', () => {
    const workouts = [
      workout('w1', '2026-10-01', entry(bench, [5, 60]), entry(squat, [5, 80])),
      workout('w2', '2026-10-03', entry(bench, [5, 62.5])),
    ];

    expect(loggedExercises(workouts)).toEqual([
      { _id: 'e2', name: 'Back Squat', sessions: 1 },
      { _id: 'e1', name: 'Bench Press', sessions: 2 },
    ]);
  });

  it('counts an exercise logged twice in one workout as one session', () => {
    const workouts = [workout('w1', '2026-10-01', entry(bench, [5, 60]), entry(bench, [3, 70]))];

    expect(loggedExercises(workouts)[0].sessions).toBe(1);
  });

  it('skips exercises that were removed from the library', () => {
    expect(loggedExercises([workout('w1', '2026-10-01', entry(null, [5, 60]))])).toEqual([]);
  });

  it('is empty with no workouts', () => {
    expect(loggedExercises([])).toEqual([]);
  });
});

describe('heaviestPerSession', () => {
  it("gives each session's heaviest set for the exercise, oldest first", () => {
    const workouts = [
      workout('w2', '2026-10-05', entry(bench, [5, 62.5], [3, 67.5], [5, 60])),
      workout('w1', '2026-10-01', entry(bench, [8, 55], [5, 60])),
    ];

    expect(heaviestPerSession(workouts, 'e1')).toEqual([
      { workoutId: 'w1', date: new Date('2026-10-01'), weight: 60, reps: 5 },
      { workoutId: 'w2', date: new Date('2026-10-05'), weight: 67.5, reps: 3 },
    ]);
  });

  it('prefers more reps when the heaviest weight appears twice', () => {
    const workouts = [workout('w1', '2026-10-01', entry(bench, [3, 70], [5, 70]))];

    expect(heaviestPerSession(workouts, 'e1')[0]).toMatchObject({ weight: 70, reps: 5 });
  });

  it('looks across all entries for the exercise in a workout', () => {
    const workouts = [workout('w1', '2026-10-01', entry(bench, [5, 60]), entry(bench, [2, 75]))];

    expect(heaviestPerSession(workouts, 'e1')[0].weight).toBe(75);
  });

  it('ignores other exercises and workouts without this one', () => {
    const workouts = [
      workout('w1', '2026-10-01', entry(squat, [5, 100])),
      workout('w2', '2026-10-02', entry(bench, [5, 60]), entry(squat, [5, 120])),
    ];

    expect(heaviestPerSession(workouts, 'e1')).toEqual([
      { workoutId: 'w2', date: new Date('2026-10-02'), weight: 60, reps: 5 },
    ]);
  });

  it('matches exercise ids given as ObjectId-like values', () => {
    const objectIdLike = { toString: () => 'e1' };
    const workouts = [
      workout('w1', '2026-10-01', entry({ _id: objectIdLike, name: 'Bench' }, [5, 60])),
    ];

    expect(heaviestPerSession(workouts, 'e1')).toHaveLength(1);
  });

  it('is empty when the exercise was never logged', () => {
    expect(heaviestPerSession([], 'e1')).toEqual([]);
  });
});

describe('weeklyCounts', () => {
  it('counts check-in days in each of the last 8 weeks, oldest first, including this week', () => {
    const dates = [
      '2026-10-19', // this week (Mon)
      '2026-10-21', // this week
      '2026-10-14', // last week
      '2026-08-31', // 8th week back (the oldest week shown)
      '2026-08-30', // 9 weeks back: too old
    ];

    const weeks = weeklyCounts(dates, '2026-10-23', 8);

    expect(weeks).toHaveLength(8);
    expect(weeks[0]).toEqual({ weekStart: '2026-08-31', count: 1 });
    expect(weeks[6]).toEqual({ weekStart: '2026-10-12', count: 1 });
    expect(weeks[7]).toEqual({ weekStart: '2026-10-19', count: 2 });
    expect(weeks.slice(1, 6).every((week) => week.count === 0)).toBe(true);
  });

  it('counts each day once', () => {
    expect(weeklyCounts(['2026-10-20', '2026-10-20'], '2026-10-23', 1)).toEqual([
      { weekStart: '2026-10-19', count: 1 },
    ]);
  });

  it('gives empty weeks when there are no check-ins', () => {
    expect(weeklyCounts([], '2026-10-23', 3).map((w) => w.count)).toEqual([0, 0, 0]);
  });
});
