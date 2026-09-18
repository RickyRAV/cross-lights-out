import '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TokenPayload } from '../services/token.service';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
