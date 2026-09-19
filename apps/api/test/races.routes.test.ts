import { describe, expect, it } from 'vitest';
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
