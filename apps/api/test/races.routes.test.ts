import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import { buildTestApp, registerAndGetAccessToken, stubRaceCalendarService } from './helpers';

describe('GET /api/v1/races', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/races' });

    expect(response.statusCode).toBe(401);
  });

  it('returns the cached race calendar', async () => {
    const app = await buildTestApp({
      raceCalendarService: stubRaceCalendarService({
        listRaces: async () => [
          {
            raceId: '2026-1',
            name: 'Australian Grand Prix',
            circuit: 'Albert Park',
            lockoutAt: '2026-03-08T04:00:00.000Z',
          },
        ],
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/races',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        raceId: '2026-1',
        name: 'Australian Grand Prix',
        circuit: 'Albert Park',
        lockoutAt: '2026-03-08T04:00:00.000Z',
      },
    ]);
  });
});

describe('GET /api/v1/races/:raceId/result', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/races/2026-1/result' });

    expect(response.statusCode).toBe(401);
  });

  it("returns the race's actual finishing order once graded", async () => {
    const app = await buildTestApp({
      raceCalendarService: stubRaceCalendarService({
        getResult: async (raceId) => ({
          raceId,
          actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
          gradedAt: '2026-03-09T18:00:00.000Z',
        }),
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/races/2026-1/result',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      raceId: '2026-1',
      actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
      gradedAt: '2026-03-09T18:00:00.000Z',
    });
  });

  it('returns 404 when the race has not been graded yet', async () => {
    const app = await buildTestApp({
      raceCalendarService: stubRaceCalendarService({
        getResult: async () => {
          throw new AppError(404, 'RaceResultNotFound', 'This race has not been graded yet');
        },
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/races/2026-1/result',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('RaceResultNotFound');
  });
});
