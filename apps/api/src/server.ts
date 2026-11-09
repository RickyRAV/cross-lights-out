import { env } from './config/env';
import { createDb } from './db/client';
import { runMigrations } from './db/migrate';
import { createJolpicaClient } from './lib/jolpica-client';
import { createDriversRepository } from './repositories/drivers.repository';
import { createGroupsRepository } from './repositories/groups.repository';
import { createHealthRepository } from './repositories/health.repository';
import { createPredictionsRepository } from './repositories/predictions.repository';
import { createRaceCalendarRepository } from './repositories/race-calendar.repository';
import { createRaceResultsRepository } from './repositories/race-results.repository';
import { createScoresRepository } from './repositories/scores.repository';
import { createUsersRepository } from './repositories/users.repository';
import { createDriversService } from './services/drivers.service';
import { createGradingService } from './services/grading.service';
import { createGroupsService } from './services/groups.service';
import { createHealthService } from './services/health.service';
import { createLeaderboardService } from './services/leaderboard.service';
import { createPredictionsService } from './services/predictions.service';
import { createRaceCalendarService } from './services/race-calendar.service';
import { createUsersService } from './services/users.service';
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
  const raceResultsRepository = createRaceResultsRepository(db);
  const predictionsRepository = createPredictionsRepository(db);
  const raceCalendarService = createRaceCalendarService({
    raceCalendarRepository,
    raceResultsRepository,
    jolpicaClient,
    cacheTtlHours: env.RACE_CALENDAR_CACHE_TTL_HOURS,
  });
  const driversService = createDriversService({
    driversRepository: createDriversRepository(db),
    jolpicaClient,
    cacheTtlHours: env.DRIVER_LIST_CACHE_TTL_HOURS,
  });
  const predictionsService = createPredictionsService({
    predictionsRepository,
    groupsRepository,
    raceCalendarService,
    driversService,
  });
  const scoresRepository = createScoresRepository(db);
  const gradingService = createGradingService({
    raceCalendarRepository,
    raceResultsRepository,
    predictionsRepository,
    scoresRepository,
    jolpicaClient,
  });
  const leaderboardService = createLeaderboardService({ groupsRepository, scoresRepository });
  const usersService = createUsersService({
    usersRepository,
    predictionsRepository,
    raceResultsRepository,
    scoresRepository,
  });
  const app = await buildApp({
    healthService,
    usersRepository,
    groupsService,
    predictionsService,
    raceCalendarService,
    driversService,
    leaderboardService,
    usersService,
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
