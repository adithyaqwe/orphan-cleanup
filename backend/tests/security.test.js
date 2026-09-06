const request = require('supertest');
const app = require('../src/server');
const { sanitizeInput } = require('../src/middleware/sanitizeMiddleware');

describe('Phase 2 Database Security & Injection Defenses', () => {
  it('Sanitization middleware strips $ operators from request body and query', () => {
    const req = {
      body: { username: 'admin', password: { $ne: null }, '$where': '1==1' },
      query: { search: { $gt: '' } },
      params: { id: '123' },
    };
    const res = {};
    const next = jest.fn();

    sanitizeInput(req, res, next);

    expect(req.body).toEqual({ username: 'admin', password: {} });
    expect(req.query).toEqual({ search: {} });
    expect(next).toHaveBeenCalled();
  });

  it('NoSQL injection query in login body is neutralized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});
