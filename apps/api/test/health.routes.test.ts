import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import type { HealthService } from '../src/services/health.service';

function stubHealthService(overrides: Partial<HealthService> = {}): HealthService {
  return {
    check: async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'lights-out-api',
      version: '0.1.0',
      database: 'up',
    }),
    ...overrides,
  };
}

describe('GET /api/v1/health', () => {
  it('returns 200 when the database is reachable', async () => {
    const app = await buildApp({ healthService: stubHealthService() });

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('returns 503 when the database is unreachable', async () => {
    const app = await buildApp({
      healthService: stubHealthService({
        check: async () => ({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          service: 'lights-out-api',
          version: '0.1.0',
          database: 'down',
        }),
      }),
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json().database).toBe('down');
  });
});
