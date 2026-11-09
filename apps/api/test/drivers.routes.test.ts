import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import {
  buildTestApp,
  registerAndGetAccessToken,
  stubDriversService,
  stubPredictionsService,
} from './helpers';

describe('GET /api/v1/drivers', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/drivers' });

    expect(response.statusCode).toBe(401);
  });

  it('returns the current season drivers', async () => {
    const app = await buildTestApp({
      driversService: stubDriversService({
        listDrivers: async () => [
          { code: 'HAM', name: 'Lewis Hamilton' },
          { code: 'VER', name: 'Max Verstappen' },
        ],
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/drivers',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { code: 'HAM', name: 'Lewis Hamilton' },
      { code: 'VER', name: 'Max Verstappen' },
    ]);
  });
});

describe('POST /api/v1/predictions with an unknown driver', () => {
  it('returns a 400 with the UnknownDriver error', async () => {
    const app = await buildTestApp({
      predictionsService: stubPredictionsService({
        submitPrediction: async () => {
          throw new AppError(400, 'UnknownDriver', 'Not a driver in the current season: XXX');
        },
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/predictions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { raceId: '2026-1', predictedOrder: ['VER', 'NOR', 'LEC', 'PIA', 'XXX'] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'UnknownDriver',
      message: 'Not a driver in the current season: XXX',
    });
  });
});
