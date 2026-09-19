import { scorePrediction } from '../lib/scoring';
import type { JolpicaClient } from '../lib/jolpica-client';
import type { PredictionsRepository } from '../repositories/predictions.repository';
import type { RaceCalendarRepository } from '../repositories/race-calendar.repository';
import type { RaceResultsRepository } from '../repositories/race-results.repository';
import type { ScoresRepository } from '../repositories/scores.repository';

export interface GradingService {
  gradeFinishedRaces(): Promise<void>;
}

export function createGradingService(deps: {
  raceCalendarRepository: RaceCalendarRepository;
  raceResultsRepository: RaceResultsRepository;
  predictionsRepository: PredictionsRepository;
  scoresRepository: ScoresRepository;
  jolpicaClient: JolpicaClient;
}): GradingService {
  return {
    async gradeFinishedRaces() {
      const races = await deps.raceCalendarRepository.findAll();
      const finishedRaces = races.filter((race) => race.lockoutAt.getTime() <= Date.now());

      for (const race of finishedRaces) {
        const alreadyGraded = await deps.raceResultsRepository.findById(race.raceId);
        if (alreadyGraded) {
          continue;
        }

        const actualOrder = await deps.jolpicaClient.fetchRaceResult(race.raceId);
        if (!actualOrder) {
          continue;
        }

        const inserted = await deps.raceResultsRepository.insertIfAbsent(race.raceId, actualOrder);
        if (!inserted) {
          continue;
        }

        const predictions = await deps.predictionsRepository.findByRaceId(race.raceId);
        await deps.scoresRepository.insertMany(
          predictions.map((prediction) => ({
            predictionId: prediction.id,
            points: scorePrediction(prediction.predictedOrder, actualOrder),
          })),
        );
      }
    },
  };
}
