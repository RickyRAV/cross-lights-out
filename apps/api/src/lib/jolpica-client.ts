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
          Driver: { code: string };
        }>;
      }>;
    };
  };
}

export interface JolpicaClient {
  fetchCurrentSeasonSchedule(): Promise<JolpicaRace[]>;
  fetchRaceResult(raceId: string): Promise<string[] | undefined>;
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

      return race.Results.sort((a, b) => Number(a.position) - Number(b.position))
        .slice(0, 5)
        .map((result) => result.Driver.code);
    },
  };
}
