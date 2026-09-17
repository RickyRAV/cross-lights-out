import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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
import type { HealthService } from './services/health.service';

export interface AppDependencies {
  healthService: HealthService;
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
  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: { info: { title: 'Lights Out API', version: '0.1.0' } },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(apiRoutes(deps), { prefix: '/api/v1' });

  return app;
}
