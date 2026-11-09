import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJolpicaClient } from '../src/lib/jolpica-client';

function respondWith(body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function result(position: number, driverId: string, code?: string) {
  return { position: String(position), Driver: { driverId, ...(code ? { code } : {}) } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('jolpicaClient.fetchRaceResult', () => {
  it('returns the top 5 driver codes in finishing order', async () => {
    respondWith({
      MRData: {
        RaceTable: {
          Races: [
            {
              Results: [
                result(3, 'hadjar', 'HAD'),
                result(1, 'norris', 'NOR'),
                result(6, 'leclerc', 'LEC'),
                result(2, 'max_verstappen', 'VER'),
                result(5, 'antonelli', 'ANT'),
                result(4, 'russell', 'RUS'),
              ],
            },
          ],
        },
      },
    });

    const order = await createJolpicaClient('https://jolpica.test').fetchRaceResult('2026-20');

    expect(order).toEqual(['NOR', 'VER', 'HAD', 'RUS', 'ANT']);
  });

  it('keeps the finishing slot of a driver without a code', async () => {
    respondWith({
      MRData: {
        RaceTable: {
          Races: [
            {
              Results: [
                result(1, 'norris', 'NOR'),
                result(2, 'max_verstappen', 'VER'),
                result(3, 'rafael_camara'),
                result(4, 'russell', 'RUS'),
                result(5, 'antonelli', 'ANT'),
              ],
            },
          ],
        },
      },
    });

    const order = await createJolpicaClient('https://jolpica.test').fetchRaceResult('2026-20');

    expect(order).toEqual(['NOR', 'VER', 'rafael_camara', 'RUS', 'ANT']);
  });

  it('returns undefined while the race has no official classification yet', async () => {
    respondWith({ MRData: { RaceTable: { Races: [] } } });

    const order = await createJolpicaClient('https://jolpica.test').fetchRaceResult('2026-21');

    expect(order).toBeUndefined();
  });

  it('requests the result for the season and round in the race id', async () => {
    const fetchMock = respondWith({ MRData: { RaceTable: { Races: [] } } });

    await createJolpicaClient('https://jolpica.test').fetchRaceResult('2026-21');

    expect(fetchMock).toHaveBeenCalledWith('https://jolpica.test/2026/21/results.json');
  });
});

function respondByPath(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = Object.keys(routes).find((candidate) => url.includes(candidate));
    const body = path === undefined ? undefined : routes[path];
    return body === undefined
      ? new Response('not found', { status: 404 })
      : new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

const seasonDrivers = {
  MRData: {
    DriverTable: {
      Drivers: [
        { code: 'LAW', givenName: 'Liam', familyName: 'Lawson' },
        { code: 'OCO', givenName: 'Esteban', familyName: 'Ocon' },
        { code: 'TSU', givenName: 'Yuki', familyName: 'Tsunoda' },
        { givenName: 'Paul', familyName: 'Aron' },
      ],
    },
  },
};

const standings = {
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          DriverStandings: [
            {
              Driver: { code: 'LAW' },
              Constructors: [{ constructorId: 'rb' }, { constructorId: 'red_bull' }],
            },
            { Driver: { code: 'OCO' }, Constructors: [{ constructorId: 'haas' }] },
            {
              Driver: { code: 'TSU' },
              Constructors: [{ constructorId: 'red_bull' }, { constructorId: 'rb' }],
            },
          ],
        },
      ],
    },
  },
};

const lastRace = {
  MRData: {
    RaceTable: {
      Races: [{ Results: [{ Driver: { code: 'LAW' }, Constructor: { constructorId: 'rb' } }] }],
    },
  },
};

describe('jolpicaClient.fetchCurrentSeasonDrivers', () => {
  it('keeps only drivers with a code and joins their names', async () => {
    respondByPath({
      '/current/drivers.json': seasonDrivers,
      '/driverstandings.json': standings,
      '/last/results.json': lastRace,
    });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers.map((driver) => [driver.code, driver.name])).toEqual([
      ['LAW', 'Liam Lawson'],
      ['OCO', 'Esteban Ocon'],
      ['TSU', 'Yuki Tsunoda'],
    ]);
  });

  it('takes the team from the last race, even when the standings list several', async () => {
    respondByPath({
      '/current/drivers.json': seasonDrivers,
      '/driverstandings.json': standings,
      '/last/results.json': lastRace,
    });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers.find((driver) => driver.code === 'LAW')?.team).toBe('rb');
  });

  it('uses the standings team for a driver who missed the last race but had one team', async () => {
    respondByPath({
      '/current/drivers.json': seasonDrivers,
      '/driverstandings.json': standings,
      '/last/results.json': lastRace,
    });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers.find((driver) => driver.code === 'OCO')?.team).toBe('haas');
  });

  it('leaves the team unknown when it cannot be told apart', async () => {
    respondByPath({
      '/current/drivers.json': seasonDrivers,
      '/driverstandings.json': standings,
      '/last/results.json': lastRace,
    });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers.find((driver) => driver.code === 'TSU')?.team).toBeNull();
  });

  it('still returns the drivers when the team lookups fail', async () => {
    respondByPath({ '/current/drivers.json': seasonDrivers });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers).toHaveLength(3);
    expect(drivers.every((driver) => driver.team === null)).toBe(true);
  });
});
