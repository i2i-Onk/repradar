const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('./helpers/db');

const alice = { name: 'Alice', email: 'alice@example.com', password: 'password123' };
const bob = { name: 'Bob', email: 'bob@example.com', password: 'password123' };

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(closeTestDB);

// Signs a user up and returns their token and id
async function signupAs(details) {
  const res = await request(app).post('/api/auth/signup').send(details);
  return { token: res.body.token, id: res.body.user._id };
}

describe('PATCH /api/users/me', () => {
  it('updates goal, equipment, weekly goal and gym location', async () => {
    const { token } = await signupAs(alice);
    const changes = {
      goal: 'strength',
      equipment: ['barbell', 'dumbbell'],
      weeklyGoal: 4,
      gymLocation: { lat: 49.2827, lng: -123.1207 },
    };

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send(changes);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject(changes);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('only changes the fields that were sent', async () => {
    const { token } = await signupAs(alice);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeklyGoal: 5 });

    expect(res.status).toBe(200);
    expect(res.body.user.weeklyGoal).toBe(5);
    expect(res.body.user.goal).toBe('general');
    expect(res.body.user.equipment).toEqual(['bodyweight']);
  });

  it('ignores fields that are not allowed to change, like email', async () => {
    const { token } = await signupAs(alice);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'hacker@example.com', passwordHash: 'x', weeklyGoal: 2 });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(alice.email);
  });

  it('rejects invalid values with 400 and names each problem field', async () => {
    const { token } = await signupAs(alice);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'flying',
        equipment: ['spaceship'],
        weeklyGoal: 9,
        gymLocation: { lat: 200, lng: -123 },
      });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((error) => error.field);
    expect(fields).toEqual(
      expect.arrayContaining(['goal', 'equipment[0]', 'weeklyGoal', 'gymLocation.lat']),
    );
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).patch('/api/users/me').send({ weeklyGoal: 4 });

    expect(res.status).toBe(401);
  });

  it('returns 404 if the account no longer exists', async () => {
    const { token, id } = await signupAs(alice);
    await User.findByIdAndDelete(id);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeklyGoal: 4 });

    expect(res.status).toBe(404);
  });

  it("cannot change another user's data, even if their id is sent", async () => {
    const aliceAuth = await signupAs(alice);
    const bobAuth = await signupAs(bob);

    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${aliceAuth.token}`)
      .send({ _id: bobAuth.id, user: bobAuth.id, weeklyGoal: 6 });

    const bobInDb = await User.findById(bobAuth.id);
    const aliceInDb = await User.findById(aliceAuth.id);
    expect(bobInDb.weeklyGoal).toBe(3);
    expect(aliceInDb.weeklyGoal).toBe(6);
  });
});
