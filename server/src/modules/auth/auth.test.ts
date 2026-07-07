import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

const app = createApp();

describe('Auth endpoints', () => {
  it('reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@test.local', password: 'wrong-password' });
    expect([401, 422]).toContain(res.status);
  });

  it('reject login without body fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
  });

  it('Google OAuth route no longer exists', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(404);
  });

  it('refresh rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect([401, 422]).toContain(res.status);
  });

  it('protected /me returns 401 without bearer', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('protected /me returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });
});
