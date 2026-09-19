import { errorResponseSchema, historyResponseSchema, meResponseSchema } from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { UsersService } from '../services/users.service';

export function usersRoutes(usersService: UsersService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/users/me',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          summary: "Get the current user's identity",
          response: {
            200: meResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const me = await usersService.getMe(request.user.sub);
        return reply.status(200).send(me);
      },
    );

    app.get(
      '/users/me/history',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          summary: "List the current user's full prediction history",
          response: {
            200: historyResponseSchema,
            401: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const history = await usersService.getHistory(request.user.sub);
        return reply.status(200).send(history);
      },
    );
  };
}
