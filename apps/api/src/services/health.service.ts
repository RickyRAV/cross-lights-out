import type { HealthResponse } from '@lightsout/shared';
import type { HealthRepository } from '../repositories/health.repository';

const SERVICE_NAME = 'lights-out-api';
const SERVICE_VERSION = '0.1.0';

export interface HealthService {
  check(): Promise<HealthResponse>;
}

export function createHealthService(deps: { healthRepository: HealthRepository }): HealthService {
  return {
    async check() {
      const timestamp = new Date().toISOString();

      try {
        await deps.healthRepository.ping();
        return {
          status: 'ok',
          timestamp,
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
          database: 'up',
        };
      } catch (error) {
        console.error('Health check failed', error);
        return {
          status: 'degraded',
          timestamp,
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
          database: 'down',
        };
      }
    },
  };
}
