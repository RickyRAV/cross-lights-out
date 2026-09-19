import type {
  GroupRacePredictionsResponse,
  PredictionResponse,
  SubmitPredictionRequest,
} from '@lightsout/shared';
import { AppError } from '../lib/errors';
import type { GroupsRepository } from '../repositories/groups.repository';
import type { Prediction, PredictionsRepository } from '../repositories/predictions.repository';
import type { RaceCalendarService } from './race-calendar.service';

export interface PredictionsService {
  submitPrediction(userId: string, input: SubmitPredictionRequest): Promise<PredictionResponse>;
  getGroupRacePredictions(
    userId: string,
    groupId: string,
    raceId: string,
  ): Promise<GroupRacePredictionsResponse>;
  getMyPrediction(userId: string, raceId: string): Promise<PredictionResponse>;
}

export function createPredictionsService(deps: {
  predictionsRepository: PredictionsRepository;
  groupsRepository: GroupsRepository;
  raceCalendarService: RaceCalendarService;
}): PredictionsService {
  return {
    async submitPrediction(userId, input) {
      const race = await deps.raceCalendarService.getRace(input.raceId);
      if (!race) {
        throw new AppError(404, 'RaceNotFound', 'No race matches this raceId');
      }

      const lockoutAt = new Date(race.lockoutAt);
      if (Date.now() >= lockoutAt.getTime()) {
        throw new AppError(409, 'PredictionsLocked', 'Predictions are locked for this race');
      }

      const prediction = await deps.predictionsRepository.upsert({
        userId,
        raceId: input.raceId,
        predictedOrder: input.predictedOrder,
        lockedAt: lockoutAt,
      });

      return toPredictionResponse(prediction);
    },

    async getGroupRacePredictions(userId, groupId, raceId) {
      const isMember = await deps.groupsRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new AppError(403, 'NotAGroupMember', 'You are not a member of this group');
      }

      const race = await deps.raceCalendarService.getRace(raceId);
      if (!race) {
        throw new AppError(404, 'RaceNotFound', 'No race matches this raceId');
      }

      const sealed = Date.now() < new Date(race.lockoutAt).getTime();

      const members = await deps.groupsRepository.listMembers(groupId);
      const memberPredictions = await deps.predictionsRepository.findByRaceForUsers(
        raceId,
        members.map((member) => member.userId),
      );
      const predictionByUserId = new Map(
        memberPredictions.map((prediction) => [prediction.userId, prediction]),
      );

      return members.map((member) => {
        const prediction = predictionByUserId.get(member.userId);
        return {
          userId: member.userId,
          displayName: member.displayName,
          submitted: prediction !== undefined,
          predictedOrder: !sealed && prediction ? prediction.predictedOrder : null,
        };
      });
    },

    async getMyPrediction(userId, raceId) {
      const prediction = await deps.predictionsRepository.findByUserAndRace(userId, raceId);
      if (!prediction) {
        throw new AppError(404, 'PredictionNotFound', 'No prediction found for this race');
      }
      return toPredictionResponse(prediction);
    },
  };
}

function toPredictionResponse(prediction: Prediction): PredictionResponse {
  return {
    id: prediction.id,
    raceId: prediction.raceId,
    predictedOrder: prediction.predictedOrder,
    submittedAt: prediction.submittedAt.toISOString(),
    lockedAt: prediction.lockedAt.toISOString(),
  };
}
