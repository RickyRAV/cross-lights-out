import type { FastifyPluginAsync } from 'fastify';
import { authRoutes } from './auth.routes';
import { driversRoutes } from './drivers.routes';
import { groupsRoutes } from './groups.routes';
import { healthRoutes } from './health.routes';
import { leaderboardRoutes } from './leaderboard.routes';
import { predictionsRoutes } from './predictions.routes';
import { racesRoutes } from './races.routes';
import { usersRoutes } from './users.routes';
import type { AppDependencies } from '../app';
import type { AuthService } from '../services/auth.service';

export function apiRoutes(
  deps: AppDependencies & { authService: AuthService },
): FastifyPluginAsync {
  return async (app) => {
    await app.register(healthRoutes(deps.healthService));
    await app.register(authRoutes(deps.authService));
    await app.register(groupsRoutes(deps.groupsService));
    await app.register(racesRoutes(deps.raceCalendarService));
    await app.register(driversRoutes(deps.driversService));
    await app.register(predictionsRoutes(deps.predictionsService));
    await app.register(leaderboardRoutes(deps.leaderboardService));
    await app.register(usersRoutes(deps.usersService));
  };
}
