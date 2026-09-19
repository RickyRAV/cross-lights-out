import { STATUS_CODES } from 'node:http';
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

  // Plugin-thrown errors with a client-facing status code (rate limiting,
  // payload too large, etc.) carry a safe, specific message worth keeping,
  // unlike a genuine 500 where the real message might leak internals.
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: STATUS_CODES[error.statusCode] ?? 'Error',
      message: error.message,
    });
  }

  request.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
}
