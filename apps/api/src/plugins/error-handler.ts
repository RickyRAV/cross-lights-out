import { ZodError } from 'zod';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.cause instanceof ZodError || error instanceof ZodError) {
    const zodError = error.cause instanceof ZodError ? error.cause : (error as unknown as ZodError);
    return reply.status(400).send({
      error: 'ValidationError',
      issues: zodError.issues,
    });
  }

  request.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
}
