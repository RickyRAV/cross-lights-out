import { describe, expect, it } from 'vitest';
import { buildTestApp, stubHealthService } from './helpers';

describe('GET /api/v1/health', () => {
  it('returns 200 when the database is reachable', async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('returns 503 when the database is unreachable', async () => {
    const app = await buildTestApp({
      healthService: {
        ...stubHealthService(),
        check: async () => ({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          service: 'lights-out-api',
          version: '0.1.0',
          database: 'down',
        }),
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json().database).toBe('down');
  });
});
