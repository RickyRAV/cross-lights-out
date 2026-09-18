import type { FastifyPluginAsync } from 'fastify';
import { authRoutes } from './auth.routes';
import { groupsRoutes } from './groups.routes';
import { healthRoutes } from './health.routes';
import type { AppDependencies } from '../app';
import type { AuthService } from '../services/auth.service';

export function apiRoutes(
  deps: AppDependencies & { authService: AuthService },
): FastifyPluginAsync {
  return async (app) => {
    await app.register(healthRoutes(deps.healthService));
    await app.register(authRoutes(deps.authService));
    await app.register(groupsRoutes(deps.groupsService));
  };
}
