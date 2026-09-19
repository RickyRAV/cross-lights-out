import { errorResponseSchema, leaderboardResponseSchema } from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { LeaderboardService } from '../services/leaderboard.service';

const groupParamsSchema = z.object({
  groupId: z.uuid(),
});

export function leaderboardRoutes(leaderboardService: LeaderboardService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/groups/:groupId/leaderboard',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Leaderboard'],
          security: [{ bearerAuth: [] }],
          summary: "List a group's season standings, ranked by total points",
          params: groupParamsSchema,
          response: {
            200: leaderboardResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { groupId } = request.params;
        const leaderboard = await leaderboardService.getLeaderboard(request.user.sub, groupId);
        return reply.status(200).send(leaderboard);
      },
    );
  };
}
