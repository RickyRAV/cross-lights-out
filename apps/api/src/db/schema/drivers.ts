import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const drivers = pgTable('drivers', {
  code: text().primaryKey(),
  name: text().notNull(),
  cachedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
