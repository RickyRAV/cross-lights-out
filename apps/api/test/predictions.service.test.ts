import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GroupsRepository } from '../src/repositories/groups.repository';
import type { Prediction, PredictionsRepository } from '../src/repositories/predictions.repository';
import { createPredictionsService } from '../src/services/predictions.service';
import type { DriversService } from '../src/services/drivers.service';
import type { RaceCalendarService } from '../src/services/race-calendar.service';

function fakePredictionsRepository(
  seed: (Prediction & { points?: number | null })[] = [],
): PredictionsRepository {
  const store = [...seed];
  return {
    async upsert(input) {
      const existingIndex = store.findIndex(
        (p) => p.userId === input.userId && p.raceId === input.raceId,
      );
      const row: Prediction = {
        id: existingIndex >= 0 ? store[existingIndex]!.id : crypto.randomUUID(),
        ...input,
        submittedAt: new Date(),
      };
      if (existingIndex >= 0) {
        store[existingIndex] = row;
      } else {
        store.push(row);
      }
      return row;
    },
    async findByUserAndRace(userId, raceId) {
      return store.find((p) => p.userId === userId && p.raceId === raceId);
    },
    async findByRaceForUsers(raceId, userIds) {
      return store
        .filter((p) => p.raceId === raceId && userIds.includes(p.userId))
        .map((p) => ({ ...p, points: p.points ?? null }));
    },
    async findByRaceId(raceId) {
      return store.filter((p) => p.raceId === raceId);
    },
    async findByUserId(userId) {
      return store.filter((p) => p.userId === userId);
    },
  };
}

function fakeGroupsRepository(
  members: { userId: string; displayName: string }[] = [],
): GroupsRepository {
  return {
    createWithCreator: async () => {
      throw new Error('not used in this test');
    },
    findByInviteCode: async () => undefined,
    addMember: async () => true,
    isMember: async (_groupId, userId) => members.some((member) => member.userId === userId),
    listMembers: async () => members,
    findByUserId: async () => {
      throw new Error('not used in this test');
    },
  };
}

function knownDrivers(codes?: string[]): Pick<DriversService, 'findUnknownCodes'> {
  return {
    findUnknownCodes: async (picked) =>
      codes ? picked.filter((code) => !codes.includes(code)) : [],
  };
}

function stubRaceCalendarServiceWithRace(
  race: { raceId: string; lockoutAt: string } | undefined,
): RaceCalendarService {
  const full = race ? { ...race, name: 'Test Grand Prix', circuit: 'Test Circuit' } : undefined;
  return {
    listRaces: async () => (full ? [full] : []),
    getRace: async (raceId) => (full && full.raceId === raceId ? full : undefined),
    getResult: async () => {
      throw new Error('not used in this test');
    },
  };
}

describe('predictionsService.submitPrediction', () => {
  it('throws RaceNotFound when the race does not exist', async () => {
    const service = createPredictionsService({
      predictionsRepository: fakePredictionsRepository(),
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace(undefined),
      driversService: knownDrivers(),
    });

    await expect(
      service.submitPrediction('user-1', {
        raceId: 'unknown',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RaceNotFound' });
  });

  it('throws PredictionsLocked once the lockout has passed', async () => {
    const service = createPredictionsService({
      predictionsRepository: fakePredictionsRepository(),
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() - 60_000).toISOString(),
      }),
      driversService: knownDrivers(),
    });

    await expect(
      service.submitPrediction('user-1', {
        raceId: '2026-1',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PredictionsLocked' });
  });

  it('stores the prediction when the lockout has not passed', async () => {
    const service = createPredictionsService({
      predictionsRepository: fakePredictionsRepository(),
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      driversService: knownDrivers(),
    });

    const result = await service.submitPrediction('user-1', {
      raceId: '2026-1',
      predictedOrder: ['A', 'B', 'C', 'D', 'E'],
    });

    expect(result.raceId).toBe('2026-1');
    expect(result.predictedOrder).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('predictionsService.submitPrediction driver validation', () => {
  it('rejects a prediction with a driver outside the current season and saves nothing', async () => {
    const predictionsRepository = fakePredictionsRepository();
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
      driversService: knownDrivers(['VER', 'NOR', 'LEC', 'PIA', 'HAM']),
    });

    await expect(
      service.submitPrediction('user-1', {
        raceId: '2026-1',
        predictedOrder: ['VER', 'NOR', 'LEC', 'PIA', 'XXX'],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'UnknownDriver' });
    expect(await predictionsRepository.findByUserAndRace('user-1', '2026-1')).toBeUndefined();
  });
});

describe('predictionsService.submitPrediction when validation outlasts the lockout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function validationThatFinishesAfter(lockoutAt: Date): Pick<DriversService, 'findUnknownCodes'> {
    return {
      findUnknownCodes: async () => {
        vi.setSystemTime(lockoutAt.getTime() + 1000);
        return [];
      },
    };
  }

  it('rejects a new prediction and saves nothing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const lockoutAt = new Date(Date.now() + 1000);
    const predictionsRepository = fakePredictionsRepository();
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: lockoutAt.toISOString(),
      }),
      driversService: validationThatFinishesAfter(lockoutAt),
    });

    await expect(
      service.submitPrediction('user-1', {
        raceId: '2026-1',
        predictedOrder: ['VER', 'NOR', 'LEC', 'PIA', 'HAM'],
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PredictionsLocked' });
    expect(await predictionsRepository.findByUserAndRace('user-1', '2026-1')).toBeUndefined();
  });

  it('keeps the existing pick instead of overwriting it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const lockoutAt = new Date(Date.now() + 1000);
    const predictionsRepository = fakePredictionsRepository([
      {
        id: 'prediction-1',
        userId: 'user-1',
        raceId: '2026-1',
        predictedOrder: ['HAM', 'RUS', 'ANT', 'VER', 'NOR'],
        lockedAt: lockoutAt,
        submittedAt: new Date(),
      },
    ]);
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: lockoutAt.toISOString(),
      }),
      driversService: validationThatFinishesAfter(lockoutAt),
    });

    await expect(
      service.submitPrediction('user-1', {
        raceId: '2026-1',
        predictedOrder: ['VER', 'NOR', 'LEC', 'PIA', 'HAM'],
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PredictionsLocked' });
    const stored = await predictionsRepository.findByUserAndRace('user-1', '2026-1');
    expect(stored?.predictedOrder).toEqual(['HAM', 'RUS', 'ANT', 'VER', 'NOR']);
  });
});

describe('predictionsService.getGroupRacePredictions', () => {
  it('throws NotAGroupMember when the requester is not a member', async () => {
    const service = createPredictionsService({
      predictionsRepository: fakePredictionsRepository(),
      groupsRepository: fakeGroupsRepository([{ userId: 'user-1', displayName: 'Racer' }]),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      driversService: knownDrivers(),
    });

    await expect(
      service.getGroupRacePredictions('outsider', 'group-1', '2026-1'),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'NotAGroupMember',
    });
  });

  it('seals other members picks before lockout, only exposing the submitted flag', async () => {
    const predictionsRepository = fakePredictionsRepository([
      {
        id: crypto.randomUUID(),
        userId: 'user-1',
        raceId: '2026-1',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
        submittedAt: new Date(),
        lockedAt: new Date(Date.now() + 60_000),
      },
    ]);
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository([
        { userId: 'user-1', displayName: 'Racer One' },
        { userId: 'user-2', displayName: 'Racer Two' },
      ]),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      driversService: knownDrivers(),
    });

    const statuses = await service.getGroupRacePredictions('user-2', 'group-1', '2026-1');

    expect(statuses).toEqual(
      expect.arrayContaining([
        {
          userId: 'user-1',
          displayName: 'Racer One',
          submitted: true,
          predictedOrder: null,
          points: null,
        },
        {
          userId: 'user-2',
          displayName: 'Racer Two',
          submitted: false,
          predictedOrder: null,
          points: null,
        },
      ]),
    );
  });

  it('reveals picks and stored points once the lockout has passed', async () => {
    const predictionsRepository = fakePredictionsRepository([
      {
        id: crypto.randomUUID(),
        userId: 'user-1',
        raceId: '2026-1',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
        submittedAt: new Date(),
        lockedAt: new Date(Date.now() - 60_000),
        points: 19,
      },
    ]);
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository([{ userId: 'user-1', displayName: 'Racer One' }]),
      raceCalendarService: stubRaceCalendarServiceWithRace({
        raceId: '2026-1',
        lockoutAt: new Date(Date.now() - 60_000).toISOString(),
      }),
      driversService: knownDrivers(),
    });

    const statuses = await service.getGroupRacePredictions('user-1', 'group-1', '2026-1');

    expect(statuses).toEqual([
      {
        userId: 'user-1',
        displayName: 'Racer One',
        submitted: true,
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
        points: 19,
      },
    ]);
  });
});

describe('predictionsService.getMyPrediction', () => {
  it('throws PredictionNotFound when the user has not predicted for that race', async () => {
    const service = createPredictionsService({
      predictionsRepository: fakePredictionsRepository(),
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace(undefined),
      driversService: knownDrivers(),
    });

    await expect(service.getMyPrediction('user-1', '2026-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PredictionNotFound',
    });
  });

  it('returns the full prediction, including a locked one', async () => {
    const predictionsRepository = fakePredictionsRepository([
      {
        id: crypto.randomUUID(),
        userId: 'user-1',
        raceId: '2026-1',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
        submittedAt: new Date(),
        lockedAt: new Date(Date.now() - 60_000),
      },
    ]);
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace(undefined),
      driversService: knownDrivers(),
    });

    const prediction = await service.getMyPrediction('user-1', '2026-1');

    expect(prediction.predictedOrder).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it("does not return another user's prediction for the same race", async () => {
    const predictionsRepository = fakePredictionsRepository([
      {
        id: crypto.randomUUID(),
        userId: 'user-2',
        raceId: '2026-1',
        predictedOrder: ['A', 'B', 'C', 'D', 'E'],
        submittedAt: new Date(),
        lockedAt: new Date(Date.now() + 60_000),
      },
    ]);
    const service = createPredictionsService({
      predictionsRepository,
      groupsRepository: fakeGroupsRepository(),
      raceCalendarService: stubRaceCalendarServiceWithRace(undefined),
      driversService: knownDrivers(),
    });

    await expect(service.getMyPrediction('user-1', '2026-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PredictionNotFound',
    });
  });
});
