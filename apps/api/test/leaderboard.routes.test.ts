import { describe, expect, it } from 'vitest';
import { buildTestApp, registerAndGetAccessToken, stubLeaderboardService } from './helpers';

describe('GET /api/v1/groups/:groupId/leaderboard', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();
    const groupId = crypto.randomUUID();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/leaderboard`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns the group standings ranked by total points', async () => {
    const groupId = crypto.randomUUID();
    const first = { userId: crypto.randomUUID(), displayName: 'Racer One', totalPoints: 30 };
    const second = { userId: crypto.randomUUID(), displayName: 'Racer Two', totalPoints: 11 };
    const app = await buildTestApp({
      leaderboardService: stubLeaderboardService({
        getLeaderboard: async () => [first, second],
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/leaderboard`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([first, second]);
  });
});
