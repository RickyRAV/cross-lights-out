import { healthResponseSchema } from '@lightsout/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { HealthService } from '../services/health.service';

export function healthRoutes(healthService: HealthService): FastifyPluginAsync {
  return async (app) => {
    app.get(
      '/health',
      {
        schema: {
          tags: ['Health'],
          summary: 'Liveness and database connectivity probe',
          response: { 200: healthResponseSchema, 503: healthResponseSchema },
        },
      },
      async (_request, reply) => {
        const result = await healthService.check();
        return reply.status(result.status === 'ok' ? 200 : 503).send(result);
      },
    );
  };
}
