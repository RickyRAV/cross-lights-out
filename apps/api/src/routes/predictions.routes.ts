import {
  errorResponseSchema,
  groupRacePredictionsResponseSchema,
  predictionResponseSchema,
  submitPredictionRequestSchema,
  validationErrorResponseSchema,
} from '@lightsout/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { PredictionsService } from '../services/predictions.service';

const groupRaceParamsSchema = z.object({
  groupId: z.uuid(),
  raceId: z.string().min(1),
});

const raceParamsSchema = z.object({
  raceId: z.string().min(1),
});

export function predictionsRoutes(predictionsService: PredictionsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/predictions',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Predictions'],
          security: [{ bearerAuth: [] }],
          summary: 'Submit or update a sealed prediction for a race',
          body: submitPredictionRequestSchema,
          response: {
            200: predictionResponseSchema,
            400: z.union([validationErrorResponseSchema, errorResponseSchema]),
            401: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const prediction = await predictionsService.submitPrediction(
          request.user.sub,
          request.body,
        );
        return reply.status(200).send(prediction);
      },
    );

    app.get(
      '/groups/:groupId/races/:raceId/predictions',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Predictions'],
          security: [{ bearerAuth: [] }],
          summary: "List a group's submission status for a race, sealed until lockout",
          params: groupRaceParamsSchema,
          response: {
            200: groupRacePredictionsResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { groupId, raceId } = request.params;
        const statuses = await predictionsService.getGroupRacePredictions(
          request.user.sub,
          groupId,
          raceId,
        );
        return reply.status(200).send(statuses);
      },
    );

    app.get(
      '/predictions/:raceId',
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ['Predictions'],
          security: [{ bearerAuth: [] }],
          summary: "Fetch the current user's own prediction for a race, locked or not",
          params: raceParamsSchema,
          response: {
            200: predictionResponseSchema,
            401: errorResponseSchema,
            404: errorResponseSchema,
            429: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { raceId } = request.params;
        const prediction = await predictionsService.getMyPrediction(request.user.sub, raceId);
        return reply.status(200).send(prediction);
      },
    );
  };
}
