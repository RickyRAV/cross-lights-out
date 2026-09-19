import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const raceResults = pgTable('race_results', {
  raceId: text().primaryKey(),
  actualOrder: jsonb().$type<string[]>().notNull(),
  gradedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
