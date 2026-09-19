import { errorResponseSchema, raceListResponseSchema } from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { RaceCalendarService } from '../services/race-calendar.service';

export function racesRoutes(raceCalendarService: RaceCalendarService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/races',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Races'],
          security: [{ bearerAuth: [] }],
          summary: 'List the current season race calendar',
          response: {
            200: raceListResponseSchema,
            401: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (_request, reply) => {
        const races = await raceCalendarService.listRaces();
        return reply.status(200).send(races);
      },
    );
  };
}
