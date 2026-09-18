import { env } from './config/env';
import { createDb } from './db/client';
import { runMigrations } from './db/migrate';
import { createGroupsRepository } from './repositories/groups.repository';
import { createHealthRepository } from './repositories/health.repository';
import { createUsersRepository } from './repositories/users.repository';
import { createGroupsService } from './services/groups.service';
import { createHealthService } from './services/health.service';
import { buildApp } from './app';

async function main(): Promise<void> {
  const { db, pool } = createDb(env.DATABASE_URL);

  if (env.RUN_MIGRATIONS_ON_START) {
    await runMigrations(db);
  }

  const healthService = createHealthService({ healthRepository: createHealthRepository(db) });
  const usersRepository = createUsersRepository(db);
  const groupsService = createGroupsService({ groupsRepository: createGroupsRepository(db) });
  const app = await buildApp({ healthService, usersRepository, groupsService });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'shutting down');
      await app.close();
      await pool.end();
      process.exit(0);
    });
  }

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((error) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
