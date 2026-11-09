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

describe('jolpicaClient.fetchCurrentSeasonDrivers', () => {
  it('keeps only drivers with a code and joins their names', async () => {
    respondWith({
      MRData: {
        DriverTable: {
          Drivers: [
            { code: 'ALB', givenName: 'Alexander', familyName: 'Albon' },
            { givenName: 'Paul', familyName: 'Aron' },
            { code: 'ANT', givenName: 'Andrea Kimi', familyName: 'Antonelli' },
          ],
        },
      },
    });

    const drivers = await createJolpicaClient('https://jolpica.test').fetchCurrentSeasonDrivers();

    expect(drivers).toEqual([
      { code: 'ALB', name: 'Alexander Albon' },
      { code: 'ANT', name: 'Andrea Kimi Antonelli' },
    ]);
  });
});
