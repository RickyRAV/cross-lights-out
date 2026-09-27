import {
  createGroupRequestSchema,
  errorResponseSchema,
  groupListResponseSchema,
  groupResponseSchema,
  joinGroupRequestSchema,
  validationErrorResponseSchema,
} from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { GroupsService } from '../services/groups.service';

export function groupsRoutes(groupsService: GroupsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/groups',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Groups'],
          security: [{ bearerAuth: [] }],
          summary: 'Create a friend group',
          body: createGroupRequestSchema,
          response: {
            201: groupResponseSchema,
            400: validationErrorResponseSchema,
            401: errorResponseSchema,
            409: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const group = await groupsService.createGroup(request.user.sub, request.body.name);
        return reply.status(201).send(group);
      },
    );

    app.post(
      '/groups/join',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Groups'],
          security: [{ bearerAuth: [] }],
          summary: 'Join a friend group with an invite code',
          body: joinGroupRequestSchema,
          response: {
            200: groupResponseSchema,
            400: validationErrorResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const group = await groupsService.joinGroup(request.user.sub, request.body.inviteCode);
        return reply.status(200).send(group);
      },
    );

    app.get(
      '/groups',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Groups'],
          security: [{ bearerAuth: [] }],
          summary: 'List the friend group the current user belongs to, at most one',
          response: {
            200: groupListResponseSchema,
            401: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const groups = await groupsService.listGroups(request.user.sub);
        return reply.status(200).send(groups);
      },
    );
  };
}
