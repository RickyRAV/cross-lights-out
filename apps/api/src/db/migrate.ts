import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client';

// dist/db/migrate.js -> apps/api/drizzle, and src/db/migrate.ts -> apps/api/drizzle
// resolve to the same folder either way.
export const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
