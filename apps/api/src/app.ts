import Fastify, { type FastifyInstance } from 'fastify';
import basicAuth from '@fastify/basic-auth';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env';
import { errorHandler } from './plugins/error-handler';
import { apiRoutes } from './routes';
import { createAuthService } from './services/auth.service';
import type { GroupsService } from './services/groups.service';
import type { HealthService } from './services/health.service';
import type { PredictionsService } from './services/predictions.service';
import type { RaceCalendarService } from './services/race-calendar.service';
import { createTokenService } from './services/token.service';
import type { UsersRepository } from './repositories/users.repository';

export interface AppDependencies {
  healthService: HealthService;
  usersRepository: UsersRepository;
  groupsService: GroupsService;
  predictionsService: PredictionsService;
  raceCalendarService: RaceCalendarService;
}

export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(cors, { origin: true });
  // CSP is for HTML pages; this is a JSON API plus one Swagger UI page,
  // so the default policy would just fight the docs page's own scripts.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE },
    verify: { allowedIss: env.JWT_ISSUER, allowedAud: env.JWT_AUDIENCE },
  });
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
    if (request.user.type !== 'access') {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: { title: 'Lights Out API', version: '0.1.0' },
      tags: [
        { name: 'Health', description: 'Liveness and readiness' },
        { name: 'Auth', description: 'Account creation and JWT issuance' },
        { name: 'Groups', description: 'Friend groups and invite codes' },
        { name: 'Races', description: 'Cached race calendar, proxied from Jolpica-F1' },
        { name: 'Predictions', description: 'Sealed prediction submission and group status' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  // Scoped to this plugin only, so /api/v1/* stays open for the mobile app —
  // just the docs UI (a full endpoint/schema map) needs credentials.
  await app.register(async (docsApp) => {
    await docsApp.register(basicAuth, {
      validate: async (username, password) => {
        if (username !== env.DOCS_USERNAME || password !== env.DOCS_PASSWORD) {
          throw new Error('Unauthorized');
        }
      },
      authenticate: true,
    });
    docsApp.addHook('onRequest', docsApp.basicAuth);
    await docsApp.register(swaggerUi, { routePrefix: '/docs' });
  });

  const authService = createAuthService({
    usersRepository: deps.usersRepository,
    tokenService: createTokenService(app, env),
  });
  await app.register(apiRoutes({ ...deps, authService }), { prefix: '/api/v1' });

  return app;
}
