import type { Database } from '../db/client';
import { scores } from '../db/schema';

export interface NewScore {
  predictionId: string;
  points: number;
}

export interface ScoresRepository {
  insertMany(input: NewScore[]): Promise<void>;
}

export function createScoresRepository(db: Database): ScoresRepository {
  return {
    async insertMany(input) {
      if (input.length === 0) {
        return;
      }
      await db.insert(scores).values(input).onConflictDoNothing({ target: scores.predictionId });
    },
  };
}
