import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/client';
import { predictions } from '../db/schema';
import { firstRow } from '../lib/db';

export interface UpsertPrediction {
  userId: string;
  raceId: string;
  predictedOrder: string[];
  lockedAt: Date;
}

export interface Prediction {
  id: string;
  userId: string;
  raceId: string;
  predictedOrder: string[];
  submittedAt: Date;
  lockedAt: Date;
}

export interface PredictionsRepository {
  upsert(input: UpsertPrediction): Promise<Prediction>;
  findByUserAndRace(userId: string, raceId: string): Promise<Prediction | undefined>;
  findByRaceForUsers(raceId: string, userIds: string[]): Promise<Prediction[]>;
  findByRaceId(raceId: string): Promise<Prediction[]>;
  findByUserId(userId: string): Promise<Prediction[]>;
}

export function createPredictionsRepository(db: Database): PredictionsRepository {
  return {
    async upsert(input) {
      const rows = await db
        .insert(predictions)
        .values(input)
        .onConflictDoUpdate({
          target: [predictions.userId, predictions.raceId],
          set: {
            predictedOrder: input.predictedOrder,
            submittedAt: new Date(),
            lockedAt: input.lockedAt,
          },
        })
        .returning();
      return firstRow(rows);
    },
    async findByUserAndRace(userId, raceId) {
      const [row] = await db
        .select()
        .from(predictions)
        .where(and(eq(predictions.userId, userId), eq(predictions.raceId, raceId)))
        .limit(1);
      return row;
    },
    async findByRaceForUsers(raceId, userIds) {
      if (userIds.length === 0) {
        return [];
      }
      return db
        .select()
        .from(predictions)
        .where(and(eq(predictions.raceId, raceId), inArray(predictions.userId, userIds)));
    },
    async findByRaceId(raceId) {
      return db.select().from(predictions).where(eq(predictions.raceId, raceId));
    },
    async findByUserId(userId) {
      return db
        .select()
        .from(predictions)
        .where(eq(predictions.userId, userId))
        .orderBy(desc(predictions.submittedAt));
    },
  };
}
