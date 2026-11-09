import { driverListResponseSchema, errorResponseSchema } from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { DriversService } from '../services/drivers.service';

export function driversRoutes(driversService: DriversService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/drivers',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Drivers'],
          security: [{ bearerAuth: [] }],
          summary: "List the current season's drivers that can be picked in a prediction",
          response: {
            200: driverListResponseSchema,
            401: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (_request, reply) => {
        const drivers = await driversService.listDrivers();
        return reply.status(200).send(drivers);
      },
    );
  };
}
