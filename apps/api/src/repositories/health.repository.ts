import type { Database } from '../db/client';
import { healthCheck } from '../db/schema';

export interface HealthRepository {
  ping(): Promise<boolean>;
}

export function createHealthRepository(db: Database): HealthRepository {
  return {
    async ping() {
      await db.select().from(healthCheck).limit(1);
      return true;
    },
  };
}
