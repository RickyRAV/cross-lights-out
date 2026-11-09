import { describe, expect, it } from 'vitest';
import type { JolpicaDriver } from '../src/lib/jolpica-client';
import type { DriverRow, DriversRepository } from '../src/repositories/drivers.repository';
import { createDriversService } from '../src/services/drivers.service';

const HOUR = 60 * 60 * 1000;

function fakeDriversRepository(seed: DriverRow[] = []) {
  let rows = [...seed];
  const repository: DriversRepository = {
    async replaceAll(list) {
      rows = list.map((driver) => ({ ...driver, cachedAt: new Date() }));
    },
    async findAll() {
      return [...rows].sort((a, b) => a.code.localeCompare(b.code));
    },
  };
  return repository;
}

function fakeJolpica(result: JolpicaDriver[] | Error) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async fetchCurrentSeasonDrivers() {
      calls += 1;
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const cachedAgo = (ms: number): DriverRow[] => [
  { code: 'HAM', name: 'Lewis Hamilton', team: 'ferrari', cachedAt: new Date(Date.now() - ms) },
];

describe('driversService.listDrivers', () => {
  it('serves a fresh cache without calling Jolpica-F1', async () => {
    const jolpicaClient = fakeJolpica([{ code: 'VER', name: 'Max Verstappen', team: 'red_bull' }]);
    const service = createDriversService({
      driversRepository: fakeDriversRepository(cachedAgo(HOUR)),
      jolpicaClient,
      cacheTtlHours: 24,
    });

    expect(await service.listDrivers()).toEqual([
      { code: 'HAM', name: 'Lewis Hamilton', team: 'ferrari' },
    ]);
    expect(jolpicaClient.calls).toBe(0);
  });

  it('replaces a stale cache with the current season drivers', async () => {
    const jolpicaClient = fakeJolpica([
      { code: 'VER', name: 'Max Verstappen', team: 'red_bull' },
      { code: 'NOR', name: 'Lando Norris', team: 'mclaren' },
    ]);
    const service = createDriversService({
      driversRepository: fakeDriversRepository(cachedAgo(25 * HOUR)),
      jolpicaClient,
      cacheTtlHours: 24,
    });

    expect(await service.listDrivers()).toEqual([
      { code: 'NOR', name: 'Lando Norris', team: 'mclaren' },
      { code: 'VER', name: 'Max Verstappen', team: 'red_bull' },
    ]);
    expect(jolpicaClient.calls).toBe(1);
  });

  it('keeps serving the stale cache when Jolpica-F1 is down', async () => {
    const service = createDriversService({
      driversRepository: fakeDriversRepository(cachedAgo(25 * HOUR)),
      jolpicaClient: fakeJolpica(new Error('Jolpica-F1 request failed with status 503')),
      cacheTtlHours: 24,
    });

    expect(await service.listDrivers()).toEqual([
      { code: 'HAM', name: 'Lewis Hamilton', team: 'ferrari' },
    ]);
  });

  it('fails when Jolpica-F1 is down and nothing is cached yet', async () => {
    const service = createDriversService({
      driversRepository: fakeDriversRepository(),
      jolpicaClient: fakeJolpica(new Error('Jolpica-F1 request failed with status 503')),
      cacheTtlHours: 24,
    });

    await expect(service.listDrivers()).rejects.toThrow('status 503');
  });

  it('keeps the cache when Jolpica-F1 returns no drivers', async () => {
    const service = createDriversService({
      driversRepository: fakeDriversRepository(cachedAgo(25 * HOUR)),
      jolpicaClient: fakeJolpica([]),
      cacheTtlHours: 24,
    });

    expect(await service.listDrivers()).toEqual([
      { code: 'HAM', name: 'Lewis Hamilton', team: 'ferrari' },
    ]);
  });
});

describe('driversService.findUnknownCodes', () => {
  it('returns only the codes that are not in the current season', async () => {
    const service = createDriversService({
      driversRepository: fakeDriversRepository(cachedAgo(HOUR)),
      jolpicaClient: fakeJolpica([]),
      cacheTtlHours: 24,
    });

    expect(await service.findUnknownCodes(['HAM', 'XXX', 'YYY'])).toEqual(['XXX', 'YYY']);
  });
});
