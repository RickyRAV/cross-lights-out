import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { hashPassword } from '../src/lib/password';
import type { GroupsService } from '../src/services/groups.service';
import type { HealthService } from '../src/services/health.service';
import type { User, UsersRepository } from '../src/repositories/users.repository';

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

function stubGroupsService(): GroupsService {
  return {
    createGroup: async () => {
      throw new Error('not used in this test');
    },
    joinGroup: async () => {
      throw new Error('not used in this test');
    },
  };
}

function fakeUsersRepository(seed: User[] = []): UsersRepository {
  const store = [...seed];
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

async function buildTestApp(usersRepository: UsersRepository) {
  return buildApp({
    healthService: stubHealthService(),
    groupsService: stubGroupsService(),
    usersRepository,
  });
}

describe('POST /api/v1/auth/register', () => {
  it('creates an account and returns a token pair', async () => {
    const app = await buildTestApp(fakeUsersRepository());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user.email).toBe('racer@example.com');
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('rejects an email that is already registered', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp(fakeUsersRepository([existing]));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });

    expect(response.statusCode).toBe(409);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp(fakeUsersRepository([existing]));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'racer@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe(existing.id);
  });

  it('rejects an incorrect password', async () => {
    const existing: User = {
      id: crypto.randomUUID(),
      email: 'racer@example.com',
      passwordHash: await hashPassword('password123'),
      displayName: 'Racer',
      createdAt: new Date(),
    };
    const app = await buildTestApp(fakeUsersRepository([existing]));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'racer@example.com', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('exchanges a valid refresh token for a new token pair', async () => {
    const app = await buildTestApp(fakeUsersRepository());

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });
    const { refreshToken } = registerResponse.json();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    expect(typeof response.json().accessToken).toBe('string');
  });

  it('rejects an access token used as a refresh token', async () => {
    const app = await buildTestApp(fakeUsersRepository());

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
    });
    const { accessToken } = registerResponse.json();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: accessToken },
    });

    expect(response.statusCode).toBe(401);
  });
});
