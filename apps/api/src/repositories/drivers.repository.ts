import { asc } from 'drizzle-orm';
import type { Database } from '../db/client';
import { drivers } from '../db/schema';
import type { JolpicaDriver } from '../lib/jolpica-client';

export interface DriverRow {
  code: string;
  name: string;
  cachedAt: Date;
}

export interface DriversRepository {
  replaceAll(list: JolpicaDriver[]): Promise<void>;
  findAll(): Promise<DriverRow[]>;
}

export function createDriversRepository(db: Database): DriversRepository {
  return {
    async replaceAll(list) {
      const cachedAt = new Date();
      await db.transaction(async (tx) => {
        await tx.delete(drivers);
        await tx.insert(drivers).values(list.map((driver) => ({ ...driver, cachedAt })));
      });
    },
    async findAll() {
      return db.select().from(drivers).orderBy(asc(drivers.code));
    },
  };
}
