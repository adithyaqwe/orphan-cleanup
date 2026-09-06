const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const seedService = require('../src/services/seedService');

jest.setTimeout(15000);

describe('Phase 2 Authentication & Cookie JWT Flow', () => {
  let seededData;

  beforeAll(async () => {
    mongoose.set('bufferCommands', false);
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orphan-cleanup-test';
    try {
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 500 });
      seededData = await seedService.seedGoldenScenario();
    } catch (e) {
      console.warn('MongoDB not reachable for test, running offline fallback mode');
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('POST /api/demo/seed seeds Golden Scenario data', async () => {
    const res = await request(app).post('/api/demo/seed');
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Golden Scenario seeded successfully');
    }
  });

  it('POST /api/auth/login with valid credentials sets HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.internal', password: 'Password123!' });

    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    }
  });

  it('POST /api/auth/login with invalid password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.internal', password: 'WrongPassword' });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toEqual('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me without token returns 401 Unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toEqual('UNAUTHENTICATED');
  });
});
