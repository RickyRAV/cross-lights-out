import type { RaceResponse } from '@lightsout/shared';
import type { JolpicaClient } from '../lib/jolpica-client';
import type { RaceCalendarRepository, RaceRow } from '../repositories/race-calendar.repository';

export interface RaceCalendarService {
  listRaces(): Promise<RaceResponse[]>;
  getRace(raceId: string): Promise<RaceResponse | undefined>;
}

export function createRaceCalendarService(deps: {
  raceCalendarRepository: RaceCalendarRepository;
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
