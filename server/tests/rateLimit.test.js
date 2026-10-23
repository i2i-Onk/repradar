// Small limits for this file only. Jest loads the app separately for each test
// file, so these don't affect the other tests (setupEnv.js gives those high limits).
process.env.LOGIN_RATE_LIMIT_MAX = '3';
process.env.SIGNUP_RATE_LIMIT_MAX = '2';
// Trust one proxy, like Render: the client's IP comes from X-Forwarded-For.
// Each test uses its own made-up IP (203.0.113.x is reserved for examples).
process.env.TRUST_PROXY = '1';

const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

const PASSWORD = 'password123';

const signup = (ip, email) =>
  request(app)
    .post('/api/auth/signup')
    .set('X-Forwarded-For', ip)
    .send({ name: 'Lifter', email, password: PASSWORD });

const login = (ip, email, password) =>
  request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email, password });

describe('login rate limit', () => {
  it('blocks an IP after too many failed attempts, even with the right password', async () => {
    await signup('203.0.113.1', 'alice@example.com');
    const ip = '203.0.113.2';
    for (let i = 0; i < 3; i += 1) {
      expect((await login(ip, 'alice@example.com', 'wrong-password')).status).toBe(401);
    }

    const res = await login(ip, 'alice@example.com', PASSWORD);

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many failed login attempts/i);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('does not count successful logins', async () => {
    await signup('203.0.113.3', 'bob@example.com');
    const ip = '203.0.113.4';

    for (let i = 0; i < 5; i += 1) {
      expect((await login(ip, 'bob@example.com', PASSWORD)).status).toBe(200);
    }
  });

  it('counts each IP separately', async () => {
    await signup('203.0.113.5', 'carol@example.com');
    for (let i = 0; i < 4; i += 1)
      await login('203.0.113.6', 'carol@example.com', 'wrong-password');

    const res = await login('203.0.113.7', 'carol@example.com', PASSWORD);

    expect(res.status).toBe(200);
  });
});

describe('signup rate limit', () => {
  it('blocks an IP after too many signups', async () => {
    const ip = '203.0.113.8';
    expect((await signup(ip, 'one@example.com')).status).toBe(201);
    expect((await signup(ip, 'two@example.com')).status).toBe(201);

    const res = await signup(ip, 'three@example.com');

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many accounts/i);
  });

  it('still lets other IPs sign up', async () => {
    for (const email of ['a@example.com', 'b@example.com', 'c@example.com']) {
      await signup('203.0.113.9', email);
    }

    expect((await signup('203.0.113.10', 'd@example.com')).status).toBe(201);
  });
});

describe('other routes', () => {
  it('are not rate limited', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect(
        (await request(app).get('/health').set('X-Forwarded-For', '203.0.113.11')).status,
      ).toBe(200);
    }
  });
});
