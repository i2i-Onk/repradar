const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const validUser = { name: 'Test User', email: 'test@example.com', password: 'password123' };

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

describe('POST /api/auth/signup', () => {
  it('creates a user and returns a token without the password hash', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app).post('/api/auth/signup').send(validUser);

    expect(res.status).toBe(409);
  });

  it('rejects invalid input with 400 and names each problem field', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: '', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((error) => error.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validUser);
  });

  it('logs in with the correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpass1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('treats email as case-insensitive', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'TEST@Example.com', password: validUser.password });

    expect(res.status).toBe(200);
  });
});

describe('GET /api/users/me', () => {
  it('returns the logged-in user for a valid token', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser);

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${signup.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.realtoken');

    expect(res.status).toBe(401);
  });
});