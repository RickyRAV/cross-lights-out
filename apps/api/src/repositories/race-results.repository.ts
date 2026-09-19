import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { raceResults } from '../db/schema';

export interface RaceResultRow {
  raceId: string;
  actualOrder: string[];
  gradedAt: Date;
}

export interface RaceResultsRepository {
  findById(raceId: string): Promise<RaceResultRow | undefined>;
  insertIfAbsent(raceId: string, actualOrder: string[]): Promise<RaceResultRow | undefined>;
}

export function createRaceResultsRepository(db: Database): RaceResultsRepository {
  return {
    async findById(raceId) {
      const [row] = await db
        .select()
        .from(raceResults)
        .where(eq(raceResults.raceId, raceId))
        .limit(1);
      return row;
    },
    async insertIfAbsent(raceId, actualOrder) {
      const rows = await db
        .insert(raceResults)
        .values({ raceId, actualOrder })
        .onConflictDoNothing({ target: raceResults.raceId })
        .returning();
      return rows[0];
    },
  };
}
