const request = require('supertest');
const app = require('../src/app');
const CheckIn = require('../src/models/CheckIn');
const { addDays, localDateIn, startOfWeek } = require('../src/utils/checkinDays');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const TZ = 'America/Vancouver';
const GYM = { lat: 49.2827, lng: -123.1207 };
// 0.0005° of latitude ≈ 56 m north of the gym; 0.01° ≈ 1,112 m
const NEAR = { lat: GYM.lat + 0.0005, lng: GYM.lng };
const FAR = { lat: GYM.lat + 0.01, lng: GYM.lng };

let alice;
let bob;

beforeAll(connectTestDB);
beforeEach(async () => {
  alice = await signupWithGym('alice@example.com');
  bob = await signupWithGym('bob@example.com');
});
afterEach(async () => {
  delete process.env.CHECKIN_RADIUS_M;
  await clearTestDB();
});
afterAll(closeTestDB);

async function signup(email) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Lifter', email, password: 'password123' });
  return { token: res.body.token, id: res.body.user._id };
}

async function signupWithGym(email) {
  const who = await signup(email);
  await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${who.token}`)
    .send({ gymLocation: GYM });
  return who;
}

const checkIn = (who, body) =>
  request(app).post('/api/checkins').set('Authorization', `Bearer ${who.token}`).send(body);

const summary = (who, timeZone = TZ) =>
  request(app)
    .get(`/api/checkins/summary?timeZone=${encodeURIComponent(timeZone)}`)
    .set('Authorization', `Bearer ${who.token}`);

// Saves a check-in directly, for days in the past
const savedCheckIn = (who, localDate, verified = true) =>
  CheckIn.create({
    user: who.id,
    coordinates: NEAR,
    distance: 56,
    verified,
    localDate,
    timeZone: TZ,
  });

const today = () => localDateIn(new Date(), TZ);

describe('POST /api/checkins', () => {
  it('verifies a check-in within 150 m of the gym and returns the streak', async () => {
    const res = await checkIn(alice, { ...NEAR, timeZone: TZ });

    expect(res.status).toBe(201);
    expect(res.body.checkIn.verified).toBe(true);
    expect(res.body.checkIn.distance).toBeGreaterThan(50);
    expect(res.body.checkIn.distance).toBeLessThan(60);
    expect(res.body.checkIn.localDate).toBe(today());
    expect(res.body.radius).toBe(150);
    expect(res.body.summary.streak).toBe(1);
    expect(res.body.summary.week.count).toBe(1);
  });

  it('records a check-in that is too far away, without counting it', async () => {
    const res = await checkIn(alice, { ...FAR, timeZone: TZ });

    expect(res.status).toBe(201);
    expect(res.body.checkIn.verified).toBe(false);
    expect(res.body.checkIn.distance).toBeGreaterThan(1100);
    expect(res.body.summary.streak).toBe(0);
  });

  it('uses CHECKIN_RADIUS_M when it is set', async () => {
    process.env.CHECKIN_RADIUS_M = '2000';

    const res = await checkIn(alice, { ...FAR, timeZone: TZ });

    expect(res.body.radius).toBe(2000);
    expect(res.body.checkIn.verified).toBe(true);
  });

  it('allows only one verified check-in per day', async () => {
    await checkIn(alice, { ...NEAR, timeZone: TZ });

    const res = await checkIn(alice, { ...NEAR, timeZone: TZ });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already checked in today/i);
    expect(await CheckIn.countDocuments({ user: alice.id, verified: true })).toBe(1);
  });

  it('lets only one of two simultaneous check-ins through', async () => {
    const results = await Promise.all([
      checkIn(alice, { ...NEAR, timeZone: TZ }),
      checkIn(alice, { ...NEAR, timeZone: TZ }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await CheckIn.countDocuments({ user: alice.id, verified: true })).toBe(1);
  });

  it('lets the user try again after a check-in that was too far away', async () => {
    await checkIn(alice, { ...FAR, timeZone: TZ });

    const res = await checkIn(alice, { ...NEAR, timeZone: TZ });

    expect(res.status).toBe(201);
    expect(res.body.checkIn.verified).toBe(true);
  });

  it("stores the day in the user's own time zone", async () => {
    // Kiritimati (UTC+14) and Pago Pago (UTC-11) are always on different dates
    const east = await checkIn(alice, { ...NEAR, timeZone: 'Pacific/Kiritimati' });
    const west = await checkIn(bob, { ...NEAR, timeZone: 'Pacific/Pago_Pago' });

    expect(east.body.checkIn.localDate).toBe(localDateIn(new Date(), 'Pacific/Kiritimati'));
    expect(west.body.checkIn.localDate).toBe(localDateIn(new Date(), 'Pacific/Pago_Pago'));
    expect(east.body.checkIn.localDate).not.toBe(west.body.checkIn.localDate);
  });

  it('returns a clear 400 if no gym location is saved yet', async () => {
    const noGym = await signup('nogym@example.com');

    const res = await checkIn(noGym, { ...NEAR, timeZone: TZ });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/gym location/i);
    expect(await CheckIn.countDocuments()).toBe(0);
  });

  it('rejects invalid coordinates or time zone with 400 and names each field', async () => {
    const res = await checkIn(alice, { lat: 200, timeZone: 'Mars/Olympus' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['lat', 'lng', 'timeZone']),
    );
  });

  it('ignores a "verified" flag or user id sent by the client', async () => {
    const res = await checkIn(alice, { ...FAR, timeZone: TZ, verified: true, user: bob.id });

    expect(res.body.checkIn.verified).toBe(false);
    expect(res.body.checkIn.user).toBe(alice.id);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app)
      .post('/api/checkins')
      .send({ ...NEAR, timeZone: TZ });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/checkins/summary', () => {
  it('counts the streak and this week from verified check-ins only', async () => {
    const t = today();
    const dates = [t, addDays(t, -1), addDays(t, -2)];
    for (const date of dates) await savedCheckIn(alice, date);
    await savedCheckIn(alice, addDays(t, -3), false); // too far: doesn't count
    await savedCheckIn(alice, addDays(t, -4));

    const res = await summary(alice);

    expect(res.status).toBe(200);
    // The unverified day 3 days ago breaks the streak, so day -4 doesn't join it
    expect(res.body.streak).toBe(3);
    const thisWeek = [...dates, addDays(t, -4)].filter((d) => d >= startOfWeek(t));
    expect(res.body.week).toMatchObject({ count: thisWeek.length, goal: 3 });
    expect(res.body.todayCheckedIn).toBe(true);
    expect(res.body.hasGymLocation).toBe(true);
    expect(res.body.radius).toBe(150);
  });

  it("is not affected by another user's check-ins", async () => {
    await savedCheckIn(bob, today());

    const res = await summary(alice);

    expect(res.body.streak).toBe(0);
    expect(res.body.week.count).toBe(0);
    expect(res.body.todayCheckedIn).toBe(false);
  });

  it('tells the page when no gym location is saved', async () => {
    const noGym = await signup('nogym@example.com');

    const res = await summary(noGym);

    expect(res.body.hasGymLocation).toBe(false);
  });

  it('requires a valid time zone', async () => {
    const res = await summary(alice, 'Mars/Olympus');

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('timeZone');
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get(`/api/checkins/summary?timeZone=${TZ}`);

    expect(res.status).toBe(401);
  });
});
