import { describe, expect, it } from 'vitest';
import type { Prediction, PredictionsRepository } from '../src/repositories/predictions.repository';
import type {
  RaceResultRow,
  RaceResultsRepository,
} from '../src/repositories/race-results.repository';
import type { ScoreRow, ScoresRepository } from '../src/repositories/scores.repository';
import type { User, UsersRepository } from '../src/repositories/users.repository';
import { createUsersService } from '../src/services/users.service';

function fakeUsersRepository(seed: User[] = []): UsersRepository {
  return {
    create: async () => {
      throw new Error('not used in this test');
    },
    findByEmail: async () => {
      throw new Error('not used in this test');
    },
    async findById(id) {
      return seed.find((user) => user.id === id);
    },
  };
}

function fakePredictionsRepository(seed: Prediction[] = []): PredictionsRepository {
  return {
    upsert: async () => {
      throw new Error('not used in this test');
    },
    findByUserAndRace: async () => {
      throw new Error('not used in this test');
    },
    findByRaceForUsers: async () => {
      throw new Error('not used in this test');
    },
    findByRaceId: async () => {
      throw new Error('not used in this test');
    },
    async findByUserId(userId) {
      return seed.filter((prediction) => prediction.userId === userId);
    },
  };
}

function fakeRaceResultsRepository(seed: RaceResultRow[] = []): RaceResultsRepository {
  return {
    findById: async () => {
      throw new Error('not used in this test');
    },
    insertIfAbsent: async () => {
      throw new Error('not used in this test');
    },
    async findByRaceIds(raceIds) {
      return seed.filter((row) => raceIds.includes(row.raceId));
    },
  };
}

function fakeScoresRepository(seed: ScoreRow[] = []): ScoresRepository {
  return {
    insertMany: async () => {
      throw new Error('not used in this test');
    },
    async findByPredictionIds(predictionIds) {
      return seed.filter((row) => predictionIds.includes(row.predictionId));
    },
  };
}

describe('usersService.getMe', () => {
  it('throws UserNotFound when the user does not exist', async () => {
    const service = createUsersService({
      usersRepository: fakeUsersRepository(),
      predictionsRepository: fakePredictionsRepository(),
      raceResultsRepository: fakeRaceResultsRepository(),
      scoresRepository: fakeScoresRepository(),
    });

    await expect(service.getMe('user-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'UserNotFound',
    });
  });

  it('returns the identity fields for an existing user', async () => {
    const service = createUsersService({
      usersRepository: fakeUsersRepository([
        {
          id: 'user-1',
          email: 'racer@example.com',
          passwordHash: 'hash',
          displayName: 'Racer',
          createdAt: new Date(),
        },
      ]),
      predictionsRepository: fakePredictionsRepository(),
      raceResultsRepository: fakeRaceResultsRepository(),
      scoresRepository: fakeScoresRepository(),
    });

    const me = await service.getMe('user-1');

    expect(me).toEqual({ id: 'user-1', email: 'racer@example.com', displayName: 'Racer' });
  });
});

describe('usersService.getHistory', () => {
  it('returns an empty array when the user has never predicted', async () => {
    const service = createUsersService({
      usersRepository: fakeUsersRepository(),
      predictionsRepository: fakePredictionsRepository(),
      raceResultsRepository: fakeRaceResultsRepository(),
      scoresRepository: fakeScoresRepository(),
    });

    expect(await service.getHistory('user-1')).toEqual([]);
  });

  it('merges predictions with their graded result and points when available', async () => {
    const prediction: Prediction = {
      id: 'prediction-1',
      userId: 'user-1',
      raceId: '2026-1',
      predictedOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
      submittedAt: new Date('2026-01-01T00:00:00Z'),
      lockedAt: new Date('2026-01-02T00:00:00Z'),
    };
    const service = createUsersService({
      usersRepository: fakeUsersRepository(),
      predictionsRepository: fakePredictionsRepository([prediction]),
      raceResultsRepository: fakeRaceResultsRepository([
        {
          raceId: '2026-1',
          actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
          gradedAt: new Date(),
        },
      ]),
      scoresRepository: fakeScoresRepository([{ predictionId: 'prediction-1', points: 25 }]),
    });

    const history = await service.getHistory('user-1');

    expect(history).toEqual([
      {
        raceId: '2026-1',
        predictedOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
        submittedAt: '2026-01-01T00:00:00.000Z',
        actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
        points: 25,
      },
    ]);
  });

  it('shows a not-yet-graded prediction with null result and points', async () => {
    const prediction: Prediction = {
      id: 'prediction-2',
      userId: 'user-1',
      raceId: '2026-2',
      predictedOrder: ['NOR', 'VER', 'LEC', 'HAM', 'RUS'],
      submittedAt: new Date('2026-02-01T00:00:00Z'),
      lockedAt: new Date('2026-02-02T00:00:00Z'),
    };
    const service = createUsersService({
      usersRepository: fakeUsersRepository(),
      predictionsRepository: fakePredictionsRepository([prediction]),
      raceResultsRepository: fakeRaceResultsRepository([]),
      scoresRepository: fakeScoresRepository([]),
    });

    const history = await service.getHistory('user-1');

    expect(history).toEqual([
      {
        raceId: '2026-2',
        predictedOrder: ['NOR', 'VER', 'LEC', 'HAM', 'RUS'],
        submittedAt: '2026-02-01T00:00:00.000Z',
        actualOrder: null,
        points: null,
      },
    ]);
  });
});
