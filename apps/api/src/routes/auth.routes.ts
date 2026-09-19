import {
  authResponseSchema,
  errorResponseSchema,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  tokenPairResponseSchema,
  validationErrorResponseSchema,
} from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthService } from '../services/auth.service';

export function authRoutes(authService: AuthService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/auth/register',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Create an account',
          body: registerRequestSchema,
          response: {
            201: authResponseSchema,
            400: validationErrorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await authService.register(request.body);
        return reply.status(201).send(result);
      },
    );

    app.post(
      '/auth/login',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Log in with email and password',
          body: loginRequestSchema,
          response: {
            200: authResponseSchema,
            400: validationErrorResponseSchema,
            401: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await authService.login(request.body);
        return reply.status(200).send(result);
      },
    );

    app.post(
      '/auth/refresh',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Exchange a refresh token for a new token pair',
          body: refreshRequestSchema,
          response: {
            200: tokenPairResponseSchema,
            400: validationErrorResponseSchema,
            401: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await authService.refresh(request.body.refreshToken);
        return reply.status(200).send(result);
      },
    );
  };
}
