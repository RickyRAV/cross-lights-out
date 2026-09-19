import { eq, inArray } from 'drizzle-orm';
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
  findByRaceIds(raceIds: string[]): Promise<RaceResultRow[]>;
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
    async findByRaceIds(raceIds) {
      if (raceIds.length === 0) {
        return [];
      }
      return db.select().from(raceResults).where(inArray(raceResults.raceId, raceIds));
    },
  };
}
