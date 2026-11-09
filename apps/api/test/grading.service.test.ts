import { describe, expect, it } from 'vitest';
import type { JolpicaClient, JolpicaRace } from '../src/lib/jolpica-client';
import type { Prediction, PredictionsRepository } from '../src/repositories/predictions.repository';
import type { RaceCalendarRepository, RaceRow } from '../src/repositories/race-calendar.repository';
import type { NewScore, ScoresRepository } from '../src/repositories/scores.repository';
import type {
  RaceResultRow,
  RaceResultsRepository,
} from '../src/repositories/race-results.repository';
import { createGradingService } from '../src/services/grading.service';

function fakeRaceCalendarRepository(races: RaceRow[]): RaceCalendarRepository {
  return {
    upsertMany: async () => {
      throw new Error('not used in this test');
    },
    findAll: async () => races,
    findById: async (raceId) => races.find((race) => race.raceId === raceId),
    getMostRecentCachedAt: async () => undefined,
  };
}

function fakeRaceResultsRepository(seed: RaceResultRow[] = []): RaceResultsRepository {
  const store = [...seed];
  return {
    async findById(raceId) {
      return store.find((row) => row.raceId === raceId);
    },
    async insertIfAbsent(raceId, actualOrder) {
      if (store.some((row) => row.raceId === raceId)) {
        return undefined;
      }
      const row: RaceResultRow = { raceId, actualOrder, gradedAt: new Date() };
      store.push(row);
      return row;
    },
    findByRaceIds: async () => {
      throw new Error('not used in this test');
    },
  };
}

function fakePredictionsRepository(seed: Prediction[]): PredictionsRepository {
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
    async findByRaceId(raceId) {
      return seed.filter((prediction) => prediction.raceId === raceId);
    },
    findByUserId: async () => {
      throw new Error('not used in this test');
    },
  };
}

function fakeScoresRepository(): ScoresRepository & { inserted: NewScore[] } {
  const inserted: NewScore[] = [];
  return {
    inserted,
    sumPointsByUserIds: async () => {
      throw new Error('not used in this test');
    },
    findByPredictionIds: async () => {
      throw new Error('not used in this test');
    },
    async insertMany(input) {
      inserted.push(...input);
    },
  };
}

function fakeJolpicaClient(results: Record<string, string[] | undefined>): JolpicaClient {
  return {
    fetchCurrentSeasonDrivers: async () => [],
    fetchCurrentSeasonSchedule: async (): Promise<JolpicaRace[]> => {
      throw new Error('not used in this test');
    },
    async fetchRaceResult(raceId) {
      return results[raceId];
    },
  };
}

function buildPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    raceId: '2026-1',
    predictedOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'],
    submittedAt: new Date(),
    lockedAt: new Date(Date.now() - 60_000),
    ...overrides,
  };
}

describe('gradingService.gradeFinishedRaces', () => {
  it('grades every prediction for a finished race with a published result', async () => {
    const race: RaceRow = {
      raceId: '2026-1',
      name: 'Test Grand Prix',
      circuit: 'Test Circuit',
      lockoutAt: new Date(Date.now() - 60_000),
      cachedAt: new Date(),
    };
    const prediction = buildPrediction({ predictedOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'] });
    const scoresRepository = fakeScoresRepository();

    const service = createGradingService({
      raceCalendarRepository: fakeRaceCalendarRepository([race]),
      raceResultsRepository: fakeRaceResultsRepository(),
      predictionsRepository: fakePredictionsRepository([prediction]),
      scoresRepository,
      jolpicaClient: fakeJolpicaClient({ '2026-1': ['VER', 'NOR', 'LEC', 'HAM', 'RUS'] }),
    });

    await service.gradeFinishedRaces();

    expect(scoresRepository.inserted).toEqual([{ predictionId: prediction.id, points: 25 }]);
  });

  it('skips races that have not reached lockout yet', async () => {
    const race: RaceRow = {
      raceId: '2026-2',
      name: 'Future Grand Prix',
      circuit: 'Future Circuit',
      lockoutAt: new Date(Date.now() + 60_000),
      cachedAt: new Date(),
    };
    const jolpicaClient = fakeJolpicaClient({});
    const scoresRepository = fakeScoresRepository();

    const service = createGradingService({
      raceCalendarRepository: fakeRaceCalendarRepository([race]),
      raceResultsRepository: fakeRaceResultsRepository(),
      predictionsRepository: fakePredictionsRepository([buildPrediction({ raceId: '2026-2' })]),
      scoresRepository,
      jolpicaClient,
    });

    await service.gradeFinishedRaces();

    expect(scoresRepository.inserted).toEqual([]);
  });

  it('skips a finished race when Jolpica-F1 has no result published yet', async () => {
    const race: RaceRow = {
      raceId: '2026-3',
      name: 'Just Finished Grand Prix',
      circuit: 'Test Circuit',
      lockoutAt: new Date(Date.now() - 60_000),
      cachedAt: new Date(),
    };
    const scoresRepository = fakeScoresRepository();

    const service = createGradingService({
      raceCalendarRepository: fakeRaceCalendarRepository([race]),
      raceResultsRepository: fakeRaceResultsRepository(),
      predictionsRepository: fakePredictionsRepository([buildPrediction({ raceId: '2026-3' })]),
      scoresRepository,
      jolpicaClient: fakeJolpicaClient({ '2026-3': undefined }),
    });

    await service.gradeFinishedRaces();

    expect(scoresRepository.inserted).toEqual([]);
  });

  it('does not re-grade or double-count a race that already has a result', async () => {
    const race: RaceRow = {
      raceId: '2026-4',
      name: 'Already Graded Grand Prix',
      circuit: 'Test Circuit',
      lockoutAt: new Date(Date.now() - 60_000),
      cachedAt: new Date(),
    };
    const raceResultsRepository = fakeRaceResultsRepository([
      { raceId: '2026-4', actualOrder: ['VER', 'NOR', 'LEC', 'HAM', 'RUS'], gradedAt: new Date() },
    ]);
    const scoresRepository = fakeScoresRepository();
    let fetchCalls = 0;
    const jolpicaClient: JolpicaClient = {
      fetchCurrentSeasonDrivers: async () => [],
      fetchCurrentSeasonSchedule: async () => {
        throw new Error('not used in this test');
      },
      async fetchRaceResult() {
        fetchCalls += 1;
        return ['VER', 'NOR', 'LEC', 'HAM', 'RUS'];
      },
    };

    const service = createGradingService({
      raceCalendarRepository: fakeRaceCalendarRepository([race]),
      raceResultsRepository,
      predictionsRepository: fakePredictionsRepository([buildPrediction({ raceId: '2026-4' })]),
      scoresRepository,
      jolpicaClient,
    });

    await service.gradeFinishedRaces();

    expect(fetchCalls).toBe(0);
    expect(scoresRepository.inserted).toEqual([]);
  });
});
