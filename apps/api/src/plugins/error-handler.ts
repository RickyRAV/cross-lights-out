import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.status(400).send({
      error: 'ValidationError',
      issues: error.validation ?? [],
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  request.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
}
