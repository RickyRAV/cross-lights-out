import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const raceCalendar = pgTable('race_calendar', {
  raceId: text().primaryKey(),
  name: text().notNull(),
  circuit: text().notNull(),
  lockoutAt: timestamp({ withTimezone: true }).notNull(),
  cachedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
