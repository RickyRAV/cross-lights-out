import { buildApp, type AppDependencies } from '../src/app';
import type { GroupsService } from '../src/services/groups.service';
import type { HealthService } from '../src/services/health.service';
import type { LeaderboardService } from '../src/services/leaderboard.service';
import type { PredictionsService } from '../src/services/predictions.service';
import type { RaceCalendarService } from '../src/services/race-calendar.service';
import type { UsersService } from '../src/services/users.service';
import type { User, UsersRepository } from '../src/repositories/users.repository';

export function stubHealthService(): HealthService {
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

export function fakeUsersRepository(seed: User[] = []): UsersRepository {
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
    async findById(id) {
      return store.find((user) => user.id === id);
    },
  };
}

export function stubGroupsService(overrides: Partial<GroupsService> = {}): GroupsService {
  return {
    createGroup: async () => {
      throw new Error('not used in this test');
    },
    joinGroup: async () => {
      throw new Error('not used in this test');
    },
    ...overrides,
  };
}

export function stubPredictionsService(
  overrides: Partial<PredictionsService> = {},
): PredictionsService {
  return {
    submitPrediction: async () => {
      throw new Error('not used in this test');
    },
    getGroupRacePredictions: async () => {
      throw new Error('not used in this test');
    },
    ...overrides,
  };
}

export function stubRaceCalendarService(
  overrides: Partial<RaceCalendarService> = {},
): RaceCalendarService {
  return {
    listRaces: async () => [],
    getRace: async () => undefined,
    ...overrides,
  };
}

export function stubLeaderboardService(
  overrides: Partial<LeaderboardService> = {},
): LeaderboardService {
  return {
    getLeaderboard: async () => {
      throw new Error('not used in this test');
    },
    ...overrides,
  };
}

export function stubUsersService(overrides: Partial<UsersService> = {}): UsersService {
  return {
    getMe: async () => {
      throw new Error('not used in this test');
    },
    getHistory: async () => {
      throw new Error('not used in this test');
    },
    ...overrides,
  };
}

export function buildTestApp(overrides: Partial<AppDependencies> = {}) {
  return buildApp({
    healthService: stubHealthService(),
    usersRepository: fakeUsersRepository(),
    groupsService: stubGroupsService(),
    predictionsService: stubPredictionsService(),
    raceCalendarService: stubRaceCalendarService(),
    leaderboardService: stubLeaderboardService(),
    usersService: stubUsersService(),
    ...overrides,
  });
}

export async function registerAndGetAccessToken(
  app: Awaited<ReturnType<typeof buildApp>>,
  email = 'racer@example.com',
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'password123', displayName: 'Racer' },
  });
  return response.json().accessToken;
}
