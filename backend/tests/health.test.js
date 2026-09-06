const request = require('supertest');
const app = require('../src/server');

describe('Backend Foundation & Health Endpoint', () => {
  it('GET /api/health returns 200 OK with PASS status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'PASS');
    expect(res.body).toHaveProperty('system', 'OrphanCleanup API Engine');
  });

  it('GET /api/non-existent returns 404 formatted response', async () => {
    const res = await request(app).get('/api/non-existent');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
