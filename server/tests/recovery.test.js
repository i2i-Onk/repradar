const { MUSCLE_GROUPS } = require('../src/config/constants');
const { calculateRecovery, recoveryStatus, sortByMostNeglected } = require('../src/utils/recovery');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// "Now" for every test: Fri 23 Oct 2026, 09:00 UTC
const NOW = new Date('2026-10-23T09:00:00.000Z');

// Workouts are saved at 12:00 on the chosen day
const daysAgoAtNoon = (days) => new Date(Date.UTC(2026, 9, 23 - days, 12));

function workout(date, ...muscleGroupLists) {
  return {
    date,
    entries: muscleGroupLists.map((muscleGroups) => ({ exercise: { muscleGroups } })),
  };
}

const byGroup = (recovery) => Object.fromEntries(recovery.map((r) => [r.muscleGroup, r]));

describe('calculateRecovery', () => {
  it('returns every muscle group, in the standard order', () => {
    const recovery = calculateRecovery([], NOW);

    expect(recovery.map((r) => r.muscleGroup)).toEqual(MUSCLE_GROUPS);
  });

  it('marks muscle groups that were never trained as null days and neglected', () => {
    const chest = byGroup(calculateRecovery([], NOW)).chest;

    expect(chest).toEqual({
      muscleGroup: 'chest',
      lastTrained: null,
      daysSince: null,
      status: 'neglected',
    });
  });

  it('counts whole days since each group was last trained', () => {
    const recovery = byGroup(
      calculateRecovery(
        [workout(daysAgoAtNoon(1), ['chest', 'triceps']), workout(daysAgoAtNoon(4), ['back'])],
        NOW,
      ),
    );

    expect(recovery.chest.daysSince).toBe(1);
    expect(recovery.triceps.daysSince).toBe(1);
    expect(recovery.back.daysSince).toBe(4);
    expect(recovery.back.lastTrained).toEqual(daysAgoAtNoon(4));
  });

  it('uses the most recent workout when a group was trained several times', () => {
    const recovery = byGroup(
      calculateRecovery(
        [
          workout(daysAgoAtNoon(9), ['quads']),
          workout(daysAgoAtNoon(2), ['quads']),
          workout(daysAgoAtNoon(5), ['quads']),
        ],
        NOW,
      ),
    );

    expect(recovery.quads.daysSince).toBe(2);
  });

  it('counts a workout logged for today as 0 days, morning or night', () => {
    const today = daysAgoAtNoon(0);
    const earlyMorning = new Date(today.getTime() - 11.5 * HOUR);
    const lateNight = new Date(today.getTime() + 11.5 * HOUR);

    expect(
      byGroup(calculateRecovery([workout(today, ['core'])], earlyMorning)).core.daysSince,
    ).toBe(0);
    expect(byGroup(calculateRecovery([workout(today, ['core'])], lateNight)).core.daysSince).toBe(
      0,
    );
  });

  it("counts yesterday's workout as 1 day, even just after midnight", () => {
    const justAfterMidnight = new Date(daysAgoAtNoon(0).getTime() - 11.5 * HOUR);
    const yesterday = new Date(daysAgoAtNoon(0).getTime() - DAY);

    const recovery = byGroup(
      calculateRecovery([workout(yesterday, ['calves'])], justAfterMidnight),
    );

    expect(recovery.calves.daysSince).toBe(1);
  });

  it('skips entries whose exercise was removed from the library', () => {
    const recovery = byGroup(
      calculateRecovery([{ date: daysAgoAtNoon(1), entries: [{ exercise: null }] }], NOW),
    );

    expect(recovery.chest.daysSince).toBeNull();
  });

  it('ignores muscle groups it does not know', () => {
    const recovery = calculateRecovery([workout(daysAgoAtNoon(1), ['wings'])], NOW);

    expect(recovery).toHaveLength(MUSCLE_GROUPS.length);
  });
});

describe('recoveryStatus', () => {
  it.each([
    [0, 'recent'],
    [2, 'recent'],
    [3, 'due'],
    [5, 'due'],
    [6, 'neglected'],
    [30, 'neglected'],
    [null, 'neglected'],
  ])('%s days → %s', (days, status) => {
    expect(recoveryStatus(days)).toBe(status);
  });
});

describe('sortByMostNeglected', () => {
  it('puts never-trained groups first, then the longest since training', () => {
    const recovery = calculateRecovery(
      [
        workout(daysAgoAtNoon(1), ['chest', 'back', 'shoulders', 'biceps', 'triceps']),
        workout(daysAgoAtNoon(3), ['quads']),
        workout(daysAgoAtNoon(8), ['hamstrings']),
        workout(daysAgoAtNoon(4), ['glutes']),
      ],
      NOW,
    );

    const order = sortByMostNeglected(recovery).map((r) => r.muscleGroup);

    // calves and core were never trained; they keep the standard order between them
    expect(order.slice(0, 5)).toEqual(['calves', 'core', 'hamstrings', 'glutes', 'quads']);
  });

  it('does not change the list it was given', () => {
    const recovery = calculateRecovery([workout(daysAgoAtNoon(1), ['chest'])], NOW);
    const before = recovery.map((r) => r.muscleGroup);

    sortByMostNeglected(recovery);

    expect(recovery.map((r) => r.muscleGroup)).toEqual(before);
  });
});
