import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Disposable: exists only to prove the migration pipeline runs end to end.
// Real domain tables land in LO-4 through LO-7.
export const healthCheck = pgTable('health_check', {
  id: serial().primaryKey(),
  service: text().notNull().default('lights-out-api'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
