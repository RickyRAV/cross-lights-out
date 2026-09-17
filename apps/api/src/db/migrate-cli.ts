import { env } from '../config/env';
import { createDb } from './client';
import { runMigrations } from './migrate';

async function main(): Promise<void> {
  const { db, pool } = createDb(env.DATABASE_URL);
  await runMigrations(db);
  await pool.end();
}

main().catch((error) => {
  console.error('Migration failed', error);
  process.exit(1);
});
