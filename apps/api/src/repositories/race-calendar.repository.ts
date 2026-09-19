import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { raceCalendar } from '../db/schema';
import type { JolpicaRace } from '../lib/jolpica-client';

export interface RaceRow {
  raceId: string;
  name: string;
  circuit: string;
  lockoutAt: Date;
  cachedAt: Date;
}

export interface RaceCalendarRepository {
  upsertMany(races: JolpicaRace[]): Promise<void>;
  findAll(): Promise<RaceRow[]>;
  findById(raceId: string): Promise<RaceRow | undefined>;
  getMostRecentCachedAt(): Promise<Date | undefined>;
}

export function createRaceCalendarRepository(db: Database): RaceCalendarRepository {
  return {
    async upsertMany(races) {
      if (races.length === 0) {
        return;
      }
      const cachedAt = new Date();
      await db
        .insert(raceCalendar)
        .values(races.map((race) => ({ ...race, cachedAt })))
        .onConflictDoUpdate({
          target: raceCalendar.raceId,
          set: {
            name: sql`excluded.name`,
            circuit: sql`excluded.circuit`,
            lockoutAt: sql`excluded.lockout_at`,
            cachedAt: sql`excluded.cached_at`,
          },
        });
    },
    async findAll() {
      return db.select().from(raceCalendar);
    },
    async findById(raceId) {
      const [row] = await db
        .select()
        .from(raceCalendar)
        .where(eq(raceCalendar.raceId, raceId))
        .limit(1);
      return row;
    },
    async getMostRecentCachedAt() {
      const [row] = await db
        .select({ cachedAt: raceCalendar.cachedAt })
        .from(raceCalendar)
        .orderBy(sql`${raceCalendar.cachedAt} desc`)
        .limit(1);
      return row?.cachedAt;
    },
  };
}
