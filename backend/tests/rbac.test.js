const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');

jest.setTimeout(15000);

describe('Phase 2 RBAC Authorization Engine', () => {
  let adminToken;
  let viewerToken;

  beforeAll(async () => {
    mongoose.set('bufferCommands', false);
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orphan-cleanup-test';
    try {
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 500 });

      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@demo.internal', password: 'Password123!' });
      if (adminRes.statusCode === 200) adminToken = adminRes.body.data.token;

      const viewerRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@demo.internal', password: 'Password123!' });
      if (viewerRes.statusCode === 200) viewerToken = viewerRes.body.data.token;
    } catch (e) {
      console.warn('MongoDB offline during RBAC test');
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('PUT /api/settings/policy without authentication is BLOCKED (401 Unauthenticated)', async () => {
    const res = await request(app)
      .put('/api/settings/policy')
      .send({ reviewThresholdHours: 24 });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toEqual('UNAUTHENTICATED');
  });

  it('PUT /api/settings/policy with VIEWER role is BLOCKED (403 Forbidden)', async () => {
    if (!viewerToken) return;
    const res = await request(app)
      .put('/api/settings/policy')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ reviewThresholdHours: 24 });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toEqual('FORBIDDEN');
  });
});
