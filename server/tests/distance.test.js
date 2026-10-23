const { distanceInMetres, EARTH_RADIUS_M } = require('../src/utils/distance');

// Expected values worked out by hand from the Earth's mean radius (6,371 km),
// so the tests don't just repeat the code's own answers
const ONE_DEGREE_AT_EQUATOR = (Math.PI / 180) * 6371000; // ≈ 111,195 m

const expectWithinOneMetre = (actual, expected) => {
  expect(Math.abs(actual - expected)).toBeLessThan(1);
};

describe('distanceInMetres', () => {
  it('uses the mean Earth radius', () => {
    expect(EARTH_RADIUS_M).toBe(6371000);
  });

  it('is 0 for the same point', () => {
    const gym = { lat: 49.2827, lng: -123.1207 };
    expect(distanceInMetres(gym, gym)).toBe(0);
  });

  it('measures 1 degree of longitude along the equator', () => {
    expectWithinOneMetre(
      distanceInMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }),
      ONE_DEGREE_AT_EQUATOR,
    );
  });

  it('measures 1 degree of latitude', () => {
    expectWithinOneMetre(
      distanceInMetres({ lat: 10, lng: 20 }, { lat: 11, lng: 20 }),
      ONE_DEGREE_AT_EQUATOR,
    );
  });

  it('measures half way round the equator', () => {
    expectWithinOneMetre(
      distanceInMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }),
      Math.PI * 6371000,
    );
  });

  it('shrinks longitude distances away from the equator (60° north)', () => {
    // 2R × asin(cos 60° × sin 0.5°) ≈ 55,597 m: about half of 1° at the equator
    expectWithinOneMetre(distanceInMetres({ lat: 60, lng: 0 }, { lat: 60, lng: 1 }), 55597);
  });

  it('is accurate at check-in scale (about 150 m)', () => {
    // 0.00135° of latitude ≈ 150.1 m
    const gym = { lat: 49.2827, lng: -123.1207 };
    const nearby = { lat: 49.2827 + 0.00135, lng: -123.1207 };

    expectWithinOneMetre(distanceInMetres(gym, nearby), 0.00135 * ONE_DEGREE_AT_EQUATOR);
  });

  it('gives the same answer in both directions', () => {
    const a = { lat: 49.2827, lng: -123.1207 };
    const b = { lat: 47.6062, lng: -122.3321 };

    expect(distanceInMetres(a, b)).toBeCloseTo(distanceInMetres(b, a), 6);
  });

  it.each([
    [
      { lat: 'x', lng: 0 },
      { lat: 0, lng: 0 },
    ],
    [{ lat: 0 }, { lat: 0, lng: 0 }],
    [
      { lat: 91, lng: 0 },
      { lat: 0, lng: 0 },
    ],
    [
      { lat: 0, lng: 0 },
      { lat: 0, lng: -181 },
    ],
  ])('rejects invalid coordinates %j → %j', (a, b) => {
    expect(() => distanceInMetres(a, b)).toThrow(/coordinates/i);
  });
});
