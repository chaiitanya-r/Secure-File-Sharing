import request from 'supertest';
import { app } from '../src/app.js';

describe('Auth routes', () => {
  it('registers and logs in a user with encrypted private key payload', async () => {
    const email = 'alice@example.com';
    const password = 'supersecurepassword';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.email).toBe(email);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.encryptedPrivateKey).toBeDefined();
    expect(loginRes.body.user.privateKeySalt).toBeDefined();
    expect(loginRes.body.user.privateKeyIv).toBeDefined();
  });

  it('rejects duplicate emails', async () => {
    const email = 'duplicate@example.com';
    const password = 'anothersecurepassword';
    await request(app).post('/api/auth/register').send({ email, password });

    const res = await request(app).post('/api/auth/register').send({ email, password });
    expect(res.status).toBe(409);
  });
});


