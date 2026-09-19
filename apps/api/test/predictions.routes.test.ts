import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import { buildTestApp, registerAndGetAccessToken, stubPredictionsService } from './helpers';

describe('POST /api/v1/predictions', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/predictions',
      payload: { raceId: '2026-1', predictedOrder: ['A', 'B', 'C', 'D', 'E'] },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects a predictedOrder with duplicate drivers', async () => {
    const app = await buildTestApp();
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/predictions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { raceId: '2026-1', predictedOrder: ['A', 'A', 'C', 'D', 'E'] },
    });

    expect(response.statusCode).toBe(400);
  });

  it('submits a prediction for an authenticated user', async () => {
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        submitPrediction: async (_userId, input) => ({
          id: crypto.randomUUID(),
          raceId: input.raceId,
          predictedOrder: input.predictedOrder,
          submittedAt: new Date().toISOString(),
          lockedAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/predictions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { raceId: '2026-1', predictedOrder: ['A', 'B', 'C', 'D', 'E'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().predictedOrder).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('surfaces a locked-prediction error from the service', async () => {
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        submitPrediction: async () => {
          throw new AppError(409, 'PredictionsLocked', 'Predictions are locked for this race');
        },
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/predictions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { raceId: '2026-1', predictedOrder: ['A', 'B', 'C', 'D', 'E'] },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('PredictionsLocked');
  });
});

describe('GET /api/v1/groups/:groupId/races/:raceId/predictions', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();
    const groupId = crypto.randomUUID();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/races/2026-1/predictions`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns the group submission status for a race', async () => {
    const groupId = crypto.randomUUID();
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        getGroupRacePredictions: async () => [
          {
            userId: crypto.randomUUID(),
            displayName: 'Racer One',
            submitted: true,
            predictedOrder: null,
          },
        ],
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}/races/2026-1/predictions`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        userId: expect.any(String),
        displayName: 'Racer One',
        submitted: true,
        predictedOrder: null,
      },
    ]);
  });
});

describe('GET /api/v1/predictions/:raceId', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/predictions/2026-1' });

    expect(response.statusCode).toBe(401);
  });

  it("returns the current user's own prediction", async () => {
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        getMyPrediction: async (_userId, raceId) => ({
          id: crypto.randomUUID(),
          raceId,
          predictedOrder: ['A', 'B', 'C', 'D', 'E'],
          submittedAt: new Date().toISOString(),
          lockedAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/predictions/2026-1',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().predictedOrder).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('returns 404 when the user has not predicted for that race', async () => {
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        getMyPrediction: async () => {
          throw new AppError(404, 'PredictionNotFound', 'No prediction found for this race');
        },
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/predictions/2026-1',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('PredictionNotFound');
  });
});
