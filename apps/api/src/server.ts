import { env } from './config/env';
import { createDb } from './db/client';
import { runMigrations } from './db/migrate';
import { createJolpicaClient } from './lib/jolpica-client';
import { createGroupsRepository } from './repositories/groups.repository';
import { createHealthRepository } from './repositories/health.repository';
import { createPredictionsRepository } from './repositories/predictions.repository';
import { createRaceCalendarRepository } from './repositories/race-calendar.repository';
import { createRaceResultsRepository } from './repositories/race-results.repository';
import { createScoresRepository } from './repositories/scores.repository';
import { createUsersRepository } from './repositories/users.repository';
import { createGradingService } from './services/grading.service';
import { createGroupsService } from './services/groups.service';
import { createHealthService } from './services/health.service';
import { createPredictionsService } from './services/predictions.service';
import { createRaceCalendarService } from './services/race-calendar.service';
import { buildApp } from './app';

async function main(): Promise<void> {
  const { db, pool } = createDb(env.DATABASE_URL);

  if (env.RUN_MIGRATIONS_ON_START) {
    await runMigrations(db);
  }

  const healthService = createHealthService({ healthRepository: createHealthRepository(db) });
  const usersRepository = createUsersRepository(db);
  const groupsRepository = createGroupsRepository(db);
  const groupsService = createGroupsService({ groupsRepository });
  const jolpicaClient = createJolpicaClient(env.JOLPICA_BASE_URL);
  const raceCalendarRepository = createRaceCalendarRepository(db);
  const predictionsRepository = createPredictionsRepository(db);
  const raceCalendarService = createRaceCalendarService({
    raceCalendarRepository,
    jolpicaClient,
    cacheTtlHours: env.RACE_CALENDAR_CACHE_TTL_HOURS,
  });
  const predictionsService = createPredictionsService({
    predictionsRepository,
    groupsRepository,
    raceCalendarService,
  });
  const gradingService = createGradingService({
    raceCalendarRepository,
    raceResultsRepository: createRaceResultsRepository(db),
    predictionsRepository,
    scoresRepository: createScoresRepository(db),
    jolpicaClient,
  });
  const app = await buildApp({
    healthService,
    usersRepository,
    groupsService,
    predictionsService,
    raceCalendarService,
  });

  const gradingInterval = setInterval(
    () => {
      gradingService.gradeFinishedRaces().catch((error) => {
        app.log.error({ error }, 'race grading job failed');
      });
    },
    env.GRADING_INTERVAL_MINUTES * 60 * 1000,
  );
  gradingService.gradeFinishedRaces().catch((error) => {
    app.log.error({ error }, 'race grading job failed');
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'shutting down');
      clearInterval(gradingInterval);
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
