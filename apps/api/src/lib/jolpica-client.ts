export interface JolpicaRace {
  raceId: string;
  name: string;
  circuit: string;
  lockoutAt: Date;
}

interface JolpicaScheduleResponse {
  MRData: {
    RaceTable: {
      Races: Array<{
        season: string;
        round: string;
        raceName: string;
        Circuit: { circuitName: string };
        date: string;
        time?: string;
      }>;
    };
  };
}

interface JolpicaResultsResponse {
  MRData: {
    RaceTable: {
      Races: Array<{
        Results: Array<{
          position: string;
          Driver: { code?: string; driverId: string };
        }>;
      }>;
    };
  };
}

interface JolpicaDriversResponse {
  MRData: {
    DriverTable: {
      Drivers: Array<{
        code?: string;
        givenName: string;
        familyName: string;
      }>;
    };
  };
}

export interface JolpicaDriver {
  code: string;
  name: string;
}

export interface JolpicaClient {
  fetchCurrentSeasonSchedule(): Promise<JolpicaRace[]>;
  fetchRaceResult(raceId: string): Promise<string[] | undefined>;
  fetchCurrentSeasonDrivers(): Promise<JolpicaDriver[]>;
}

export function createJolpicaClient(baseUrl: string): JolpicaClient {
  return {
    async fetchCurrentSeasonSchedule() {
      const response = await fetch(`${baseUrl}/current.json?limit=50`);
      if (!response.ok) {
        throw new Error(`Jolpica-F1 request failed with status ${response.status}`);
      }

      const body = (await response.json()) as JolpicaScheduleResponse;

      return body.MRData.RaceTable.Races.map((race) => ({
        raceId: `${race.season}-${race.round}`,
        name: race.raceName,
        circuit: race.Circuit.circuitName,
        // A handful of far-future races publish a date with no confirmed time yet.
        // Midnight UTC is a safe placeholder since the cache refreshes daily.
        lockoutAt: new Date(`${race.date}T${race.time ?? '00:00:00Z'}`),
      }));
    },
    async fetchRaceResult(raceId) {
      const [season, round] = raceId.split('-');
      const response = await fetch(`${baseUrl}/${season}/${round}/results.json`);
      if (!response.ok) {
        throw new Error(`Jolpica-F1 request failed with status ${response.status}`);
      }

      const body = (await response.json()) as JolpicaResultsResponse;
      const race = body.MRData.RaceTable.Races[0];
      // The endpoint returns an empty Races array until the session has an official classification.
      if (!race) {
        return undefined;
      }

      return (
        race.Results.sort((a, b) => Number(a.position) - Number(b.position))
          .slice(0, 5)
          // Some drivers who do race have no code. Their driverId keeps the finishing slot
          // without ever matching a pick, since picks are validated against coded drivers.
          .map((result) => result.Driver.code ?? result.Driver.driverId)
      );
    },
    async fetchCurrentSeasonDrivers() {
      const response = await fetch(`${baseUrl}/current/drivers.json?limit=100`);
      if (!response.ok) {
        throw new Error(`Jolpica-F1 request failed with status ${response.status}`);
      }

      const body = (await response.json()) as JolpicaDriversResponse;
      // Reserve and practice-only drivers have no code, and results are graded by code.
      return body.MRData.DriverTable.Drivers.flatMap((driver) =>
        driver.code
          ? [{ code: driver.code, name: `${driver.givenName} ${driver.familyName}` }]
          : [],
      );
    },
  };
}
