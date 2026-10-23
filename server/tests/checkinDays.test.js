const {
  addDays,
  calculateStreak,
  isValidTimeZone,
  localDateIn,
  startOfWeek,
  weeklyProgress,
} = require('../src/utils/checkinDays');

describe('localDateIn', () => {
  it("gives the calendar date in the user's time zone", () => {
    const moment = new Date('2026-10-23T06:30:00Z');

    expect(localDateIn(moment, 'America/Vancouver')).toBe('2026-10-22'); // 23:30 the night before
    expect(localDateIn(moment, 'Asia/Kolkata')).toBe('2026-10-23'); // 12:00
    expect(localDateIn(moment, 'UTC')).toBe('2026-10-23');
  });

  it('moves to the next day east of UTC', () => {
    // New Zealand is UTC+13 in October
    expect(localDateIn(new Date('2026-10-23T23:30:00Z'), 'Pacific/Auckland')).toBe('2026-10-24');
  });
});

describe('isValidTimeZone', () => {
  it.each(['UTC', 'America/Vancouver', 'Europe/London'])('accepts %s', (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
  });

  it.each(['Mars/Olympus', '', 'not a zone', undefined, 42])('rejects %p', (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });
});

describe('addDays', () => {
  it.each([
    ['2026-10-23', 1, '2026-10-24'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'], // leap year
    ['2026-11-01', 7, '2026-11-08'], // across the clocks going back (calendar dates have no clock)
  ])('%s + %i days = %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe('startOfWeek (weeks start on Monday)', () => {
  it.each([
    ['2026-10-19', '2026-10-19'], // Monday
    ['2026-10-23', '2026-10-19'], // Friday
    ['2026-10-25', '2026-10-19'], // Sunday
    ['2026-11-01', '2026-10-26'], // Sunday, across a month
  ])('%s → %s', (date, monday) => {
    expect(startOfWeek(date)).toBe(monday);
  });
});

describe('calculateStreak', () => {
  const today = '2026-10-23';

  it('is 0 with no check-ins', () => {
    expect(calculateStreak([], today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(calculateStreak(['2026-10-21', '2026-10-22', '2026-10-23'], today)).toBe(3);
  });

  it("stays alive if the last check-in was yesterday (today isn't over yet)", () => {
    expect(calculateStreak(['2026-10-21', '2026-10-22'], today)).toBe(2);
  });

  it('is broken by a missed day', () => {
    expect(calculateStreak(['2026-10-20', '2026-10-21'], today)).toBe(0);
    expect(calculateStreak(['2026-10-19', '2026-10-22', '2026-10-23'], today)).toBe(2);
  });

  it('copes with duplicates and any order', () => {
    expect(calculateStreak(['2026-10-23', '2026-10-21', '2026-10-22', '2026-10-23'], today)).toBe(
      3,
    );
  });

  it('continues across a month boundary', () => {
    expect(calculateStreak(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2);
  });
});

describe('weeklyProgress', () => {
  it("counts this week's check-in days against the goal", () => {
    const dates = ['2026-10-18', '2026-10-19', '2026-10-21', '2026-10-23'];

    expect(weeklyProgress(dates, '2026-10-23', 3)).toEqual({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      count: 3, // the 18th was last week
      goal: 3,
      remaining: 0,
    });
  });

  it('reports how many check-ins are still needed', () => {
    expect(weeklyProgress(['2026-10-19'], '2026-10-20', 4)).toMatchObject({
      count: 1,
      remaining: 3,
    });
  });

  it('counts each day once', () => {
    expect(weeklyProgress(['2026-10-20', '2026-10-20'], '2026-10-20', 3).count).toBe(1);
  });

  it('starts fresh on Monday', () => {
    expect(weeklyProgress(['2026-10-25'], '2026-10-26', 3)).toMatchObject({
      weekStart: '2026-10-26',
      count: 0,
    });
  });
});
