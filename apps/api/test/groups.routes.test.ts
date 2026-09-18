import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import type { GroupsService } from '../src/services/groups.service';
import type { HealthService } from '../src/services/health.service';
import type { User, UsersRepository } from '../src/repositories/users.repository';
import { AppError } from '../src/lib/errors';

function stubHealthService(): HealthService {
  return {
    check: async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'lights-out-api',
      version: '0.1.0',
      database: 'up',
    }),
  };
}

function fakeUsersRepository(): UsersRepository {
  const store: User[] = [];
  return {
    async create(user) {
      const row: User = { id: crypto.randomUUID(), createdAt: new Date(), ...user };
      store.push(row);
      return row;
    },
    async findByEmail(email) {
      return store.find((user) => user.email === email);
    },
  };
}

function stubGroupsService(overrides: Partial<GroupsService> = {}): GroupsService {
  return {
    createGroup: async (userId, name) => ({
      id: crypto.randomUUID(),
      name,
      inviteCode: 'ABCD1234',
      createdAt: new Date().toISOString(),
    }),
    joinGroup: async () => {
      throw new AppError(404, 'InvalidInviteCode', 'No active group matches this invite code');
    },
    ...overrides,
  };
}

async function registerAndGetAccessToken(
  app: Awaited<ReturnType<typeof buildApp>>,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
  });
  return response.json().accessToken;
}

describe('POST /api/v1/groups', () => {
  it('rejects a request without a token', async () => {
    const app = await buildApp({
      healthService: stubHealthService(),
      usersRepository: fakeUsersRepository(),
      groupsService: stubGroupsService(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Paddock Club' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates a group for an authenticated user', async () => {
    const app = await buildApp({
      healthService: stubHealthService(),
      usersRepository: fakeUsersRepository(),
      groupsService: stubGroupsService(),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Paddock Club' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().inviteCode).toBe('ABCD1234');
  });
});

describe('POST /api/v1/groups/join', () => {
  it('rejects an invalid invite code with a clear error', async () => {
    const app = await buildApp({
      healthService: stubHealthService(),
      usersRepository: fakeUsersRepository(),
      groupsService: stubGroupsService(),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups/join',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { inviteCode: 'DOES-NOT-EXIST' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('InvalidInviteCode');
  });

  it('joins a group given a valid invite code', async () => {
    const app = await buildApp({
      healthService: stubHealthService(),
      usersRepository: fakeUsersRepository(),
      groupsService: stubGroupsService({
        joinGroup: async (_userId, inviteCode) => ({
          id: crypto.randomUUID(),
          name: 'Paddock Club',
          inviteCode,
          createdAt: new Date().toISOString(),
        }),
      }),
    });
    const accessToken = await registerAndGetAccessToken(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups/join',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { inviteCode: 'ABCD1234' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().inviteCode).toBe('ABCD1234');
  });
});
