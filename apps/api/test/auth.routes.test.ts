import { describe, expect, it } from 'vitest';
import { hashPassword } from '../src/lib/password';
import type { User } from '../src/repositories/users.repository';
import { buildTestApp, fakeUsersRepository } from './helpers';

describe('POST /api/v1/auth/register', () => {
  it('creates an account and returns a token pair', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user.email).toBe('racer@example.com');
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('rejects an email that is already registered', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp({ usersRepository: fakeUsersRepository([existing]) });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });

    expect(response.statusCode).toBe(409);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp({ usersRepository: fakeUsersRepository([existing]) });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'racer@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe(existing.id);
  });

  it('rejects an incorrect password', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp({ usersRepository: fakeUsersRepository([existing]) });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'racer@example.com', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('exchanges a valid refresh token for a new token pair', async () => {
    const app = await buildTestApp();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });
    const { refreshToken } = registerResponse.json();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    expect(typeof response.json().accessToken).toBe('string');
  });

  it('rejects an access token used as a refresh token', async () => {
    const app = await buildTestApp();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });
    const { accessToken } = registerResponse.json();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: accessToken },
    });

    expect(response.statusCode).toBe(401);
  });
});
