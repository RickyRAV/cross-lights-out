import type { RaceResponse, RaceResultResponse } from '@lightsout/shared';
import { AppError } from '../lib/errors';
import type { JolpicaClient } from '../lib/jolpica-client';
import type { RaceCalendarRepository, RaceRow } from '../repositories/race-calendar.repository';
import type { RaceResultRow, RaceResultsRepository } from '../repositories/race-results.repository';

export interface RaceCalendarService {
  listRaces(): Promise<RaceResponse[]>;
  getRace(raceId: string): Promise<RaceResponse | undefined>;
  getResult(raceId: string): Promise<RaceResultResponse>;
}

export function createRaceCalendarService(deps: {
  raceCalendarRepository: RaceCalendarRepository;
  raceResultsRepository: RaceResultsRepository;
  jolpicaClient: JolpicaClient;
  cacheTtlHours: number;
}): RaceCalendarService {
  async function ensureFreshCache(): Promise<void> {
    const mostRecentCachedAt = await deps.raceCalendarRepository.getMostRecentCachedAt();
    const staleBefore = Date.now() - deps.cacheTtlHours * 60 * 60 * 1000;
    if (mostRecentCachedAt && mostRecentCachedAt.getTime() >= staleBefore) {
      return;
    }

    const races = await deps.jolpicaClient.fetchCurrentSeasonSchedule();
    await deps.raceCalendarRepository.upsertMany(races);
  }

  return {
    async listRaces() {
      await ensureFreshCache();
      const rows = await deps.raceCalendarRepository.findAll();
      return rows.map(toRaceResponse);
    },
    async getRace(raceId) {
      await ensureFreshCache();
      const row = await deps.raceCalendarRepository.findById(raceId);
      return row ? toRaceResponse(row) : undefined;
    },
    async getResult(raceId) {
      const row = await deps.raceResultsRepository.findById(raceId);
      if (!row) {
        throw new AppError(404, 'RaceResultNotFound', 'This race has not been graded yet');
      }
      return toRaceResultResponse(row);
    },
  };
}

function toRaceResponse(row: RaceRow): RaceResponse {
  return {
    raceId: row.raceId,
    name: row.name,
    circuit: row.circuit,
    lockoutAt: row.lockoutAt.toISOString(),
  };
}

function toRaceResultResponse(row: RaceResultRow): RaceResultResponse {
  return {
    raceId: row.raceId,
    actualOrder: row.actualOrder,
    gradedAt: row.gradedAt.toISOString(),
  };
}
