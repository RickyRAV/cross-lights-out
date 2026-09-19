import type { HistoryResponse, MeResponse } from '@lightsout/shared';
import { AppError } from '../lib/errors';
import type { PredictionsRepository } from '../repositories/predictions.repository';
import type { RaceResultsRepository } from '../repositories/race-results.repository';
import type { ScoresRepository } from '../repositories/scores.repository';
import type { User, UsersRepository } from '../repositories/users.repository';

export interface UsersService {
  getMe(userId: string): Promise<MeResponse>;
  getHistory(userId: string): Promise<HistoryResponse>;
}

export function createUsersService(deps: {
  usersRepository: UsersRepository;
  predictionsRepository: PredictionsRepository;
  raceResultsRepository: RaceResultsRepository;
  scoresRepository: ScoresRepository;
}): UsersService {
  return {
    async getMe(userId) {
      const user = await deps.usersRepository.findById(userId);
      if (!user) {
        throw new AppError(404, 'UserNotFound', 'No user matches this id');
      }
      return toMeResponse(user);
    },

    async getHistory(userId) {
      const userPredictions = await deps.predictionsRepository.findByUserId(userId);
      if (userPredictions.length === 0) {
        return [];
      }

      const [raceResults, scores] = await Promise.all([
        deps.raceResultsRepository.findByRaceIds(userPredictions.map((p) => p.raceId)),
        deps.scoresRepository.findByPredictionIds(userPredictions.map((p) => p.id)),
      ]);
      const raceResultByRaceId = new Map(raceResults.map((result) => [result.raceId, result]));
      const pointsByPredictionId = new Map(
        scores.map((score) => [score.predictionId, score.points]),
      );

      return userPredictions.map((prediction) => ({
        raceId: prediction.raceId,
        predictedOrder: prediction.predictedOrder,
        submittedAt: prediction.submittedAt.toISOString(),
        actualOrder: raceResultByRaceId.get(prediction.raceId)?.actualOrder ?? null,
        points: pointsByPredictionId.get(prediction.id) ?? null,
      }));
    },
  };
}

function toMeResponse(user: User): MeResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
