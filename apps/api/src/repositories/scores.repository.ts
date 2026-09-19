import { eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { predictions, scores } from '../db/schema';

export interface NewScore {
  predictionId: string;
  points: number;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  racesScored: number;
}

export interface ScoreRow {
  predictionId: string;
  points: number;
}

export interface ScoresRepository {
  insertMany(input: NewScore[]): Promise<void>;
  sumPointsByUserIds(userIds: string[]): Promise<UserPoints[]>;
  findByPredictionIds(predictionIds: string[]): Promise<ScoreRow[]>;
}

export function createScoresRepository(db: Database): ScoresRepository {
  return {
    async insertMany(input) {
      if (input.length === 0) {
        return;
      }
      await db.insert(scores).values(input).onConflictDoNothing({ target: scores.predictionId });
    },
    async sumPointsByUserIds(userIds) {
      if (userIds.length === 0) {
        return [];
      }
      const rows = await db
        .select({
          userId: predictions.userId,
          totalPoints: sql<string>`sum(${scores.points})`,
          racesScored: sql<string>`count(${scores.id})`,
        })
        .from(scores)
        .innerJoin(predictions, eq(predictions.id, scores.predictionId))
        .where(inArray(predictions.userId, userIds))
        .groupBy(predictions.userId);
      return rows.map((row) => ({
        userId: row.userId,
        totalPoints: Number(row.totalPoints),
        racesScored: Number(row.racesScored),
      }));
    },
    async findByPredictionIds(predictionIds) {
      if (predictionIds.length === 0) {
        return [];
      }
      return db
        .select({ predictionId: scores.predictionId, points: scores.points })
        .from(scores)
        .where(inArray(scores.predictionId, predictionIds));
    },
  };
}
