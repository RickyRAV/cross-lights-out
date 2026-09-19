import { jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const predictions = pgTable(
  'predictions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    // Not a foreign key to race_calendar on purpose, see docs/data-model.md.
    raceId: text().notNull(),
    predictedOrder: jsonb().$type<string[]>().notNull(),
    submittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [unique().on(table.userId, table.raceId)],
);
