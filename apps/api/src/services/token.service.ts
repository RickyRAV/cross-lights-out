import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env';
import { AppError } from '../lib/errors';

export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
}

export interface TokenService {
  signAccessToken(userId: string): string;
  signRefreshToken(userId: string): string;
  verifyRefreshToken(token: string): TokenPayload;
}

export function createTokenService(app: FastifyInstance, env: Env): TokenService {
  return {
    signAccessToken(userId) {
      return app.jwt.sign(
        { sub: userId, type: 'access' },
        { expiresIn: `${env.JWT_ACCESS_TOKEN_EXPIRY_MINUTES}m` },
      );
    },
    signRefreshToken(userId) {
      return app.jwt.sign(
        { sub: userId, type: 'refresh' },
        { expiresIn: `${env.JWT_REFRESH_TOKEN_EXPIRY_DAYS}d` },
      );
    },
    verifyRefreshToken(token) {
      let payload: TokenPayload;
      try {
        payload = app.jwt.verify<TokenPayload>(token);
      } catch {
        throw new AppError(401, 'InvalidToken', 'Refresh token is invalid or expired');
      }
      if (payload.type !== 'refresh') {
        throw new AppError(401, 'InvalidToken', 'Not a refresh token');
      }
      return payload;
    },
  };
}
