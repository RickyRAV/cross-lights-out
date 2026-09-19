import {
  errorResponseSchema,
  raceListResponseSchema,
  raceResultResponseSchema,
} from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { RaceCalendarService } from '../services/race-calendar.service';

const raceParamsSchema = z.object({
  raceId: z.string().min(1),
});

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

    app.get(
      '/races/:raceId/result',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Races'],
          security: [{ bearerAuth: [] }],
          summary: "A race's actual finishing order, once graded",
          params: raceParamsSchema,
          response: {
            200: raceResultResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { raceId } = request.params;
        const result = await raceCalendarService.getResult(raceId);
        return reply.status(200).send(result);
      },
    );
  };
}
