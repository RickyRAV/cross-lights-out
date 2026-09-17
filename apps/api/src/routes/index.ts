import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.routes';
import type { AppDependencies } from '../app';

export function apiRoutes(deps: AppDependencies): FastifyPluginAsync {
  return async (app) => {
    await app.register(healthRoutes(deps.healthService));
  };
}
