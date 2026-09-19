import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import { buildTestApp, registerAndGetAccessToken, stubUsersService } from './helpers';

describe('GET /api/v1/users/me', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/users/me' });

    expect(response.statusCode).toBe(401);
  });

  it("returns the current user's identity", async () => {
    const app = await buildTestApp({
      usersService: stubUsersService({
        getMe: async (userId) => ({
          id: userId,
          email: 'racer@example.com',
          displayName: 'Racer',
        }),
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().displayName).toBe('Racer');
  });

  it('surfaces a not-found error from the service', async () => {
    const app = await buildTestApp({
      usersService: stubUsersService({
        getMe: async () => {
          throw new AppError(404, 'UserNotFound', 'No user matches this id');
        },
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('UserNotFound');
  });
});

describe('GET /api/v1/users/me/history', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/users/me/history' });

    expect(response.statusCode).toBe(401);
  });

  it("returns the current user's prediction history", async () => {
    const app = await buildTestApp({
      usersService: stubUsersService({
        getHistory: async () => [
          {
            raceId: '2026-1',
            predictedOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
            submittedAt: new Date().toISOString(),
            actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
            points: 25,
          },
          {
            raceId: '2026-2',
            predictedOrder: ['NOR', 'VER', 'LEC', 'HAM', 'RUS'],
            submittedAt: new Date().toISOString(),
            actualOrder: null,
            points: null,
          },
        ],
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/history',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body[0].points).toBe(25);
    expect(body[1].actualOrder).toBeNull();
    expect(body[1].points).toBeNull();
  });

  it('returns an empty array when the user has never predicted', async () => {
    const app = await buildTestApp({
      usersService: stubUsersService({ getHistory: async () => [] }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/history',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});
