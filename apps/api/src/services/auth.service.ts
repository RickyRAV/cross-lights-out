import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  TokenPairResponse,
} from '@lightsout/shared';
import { AppError } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import type { User, UsersRepository } from '../repositories/users.repository';
import type { TokenService } from './token.service';

export interface AuthService {
  register(input: RegisterRequest): Promise<AuthResponse>;
  login(input: LoginRequest): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<TokenPairResponse>;
}

export function createAuthService(deps: {
  usersRepository: UsersRepository;
  tokenService: TokenService;
}): AuthService {
  function issueTokens(user: User): AuthResponse {
    return {
      accessToken: deps.tokenService.signAccessToken(user.id),
      refreshToken: deps.tokenService.signRefreshToken(user.id),
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  return {
    async register({ email, password, displayName }) {
      const existing = await deps.usersRepository.findByEmail(email);
      if (existing) {
        throw new AppError(
          409,
          'EmailAlreadyRegistered',
          'An account with this email already exists',
        );
      }
      const passwordHash = await hashPassword(password);
      const user = await deps.usersRepository.create({ email, passwordHash, displayName });
      return issueTokens(user);
    },

    async login({ email, password }) {
      const user = await deps.usersRepository.findByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new AppError(401, 'InvalidCredentials', 'Email or password is incorrect');
      }
      return issueTokens(user);
    },

    async refresh(refreshToken) {
      const payload = deps.tokenService.verifyRefreshToken(refreshToken);
      return {
        accessToken: deps.tokenService.signAccessToken(payload.sub),
        refreshToken: deps.tokenService.signRefreshToken(payload.sub),
      };
    },
  };
}
