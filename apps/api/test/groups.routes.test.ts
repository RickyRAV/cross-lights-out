import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import { buildTestApp, registerAndGetAccessToken, stubGroupsService } from './helpers';

describe('POST /api/v1/groups', () => {
  it('rejects a request without a token', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Paddock Club' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates a group for an authenticated user', async () => {
    const app = await buildTestApp({
      groupsService: stubGroupsService({
        createGroup: async (_userId, name) => ({
          id: crypto.randomUUID(),
          name,
          inviteCode: 'ABCD1234',
          createdAt: new Date().toISOString(),
        }),
      }),
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
    const app = await buildTestApp({
      groupsService: stubGroupsService({
        joinGroup: async () => {
          throw new AppError(404, 'InvalidInviteCode', 'No active group matches this invite code');
        },
      }),
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
    const app = await buildTestApp({
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
