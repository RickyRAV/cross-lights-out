import type { DriverResponse } from '@lightsout/shared';
import type { JolpicaClient } from '../lib/jolpica-client';
import type { DriverRow, DriversRepository } from '../repositories/drivers.repository';

export interface DriversService {
  listDrivers(): Promise<DriverResponse[]>;
  findUnknownCodes(codes: string[]): Promise<string[]>;
}

export function createDriversService(deps: {
  driversRepository: DriversRepository;
  jolpicaClient: Pick<JolpicaClient, 'fetchCurrentSeasonDrivers'>;
  cacheTtlHours: number;
}): DriversService {
  async function loadDrivers(): Promise<DriverRow[]> {
    const cached = await deps.driversRepository.findAll();
    const staleBefore = Date.now() - deps.cacheTtlHours * 60 * 60 * 1000;
    if (cached[0] && cached[0].cachedAt.getTime() >= staleBefore) {
      return cached;
    }

    try {
      const fetched = await deps.jolpicaClient.fetchCurrentSeasonDrivers();
      if (fetched.length === 0) {
        return cached;
      }
      await deps.driversRepository.replaceAll(fetched);
      return deps.driversRepository.findAll();
    } catch (error) {
      if (cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }

  return {
    async listDrivers() {
      const rows = await loadDrivers();
      return rows.map(({ code, name, team }) => ({ code, name, team }));
    },
    async findUnknownCodes(codes) {
      const known = new Set((await loadDrivers()).map((row) => row.code));
      return codes.filter((code) => !known.has(code));
    },
  };
}
