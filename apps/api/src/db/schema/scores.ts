import { integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { predictions } from './predictions';

export const scores = pgTable(
  'scores',
  {
    id: uuid().primaryKey().defaultRandom(),
    predictionId: uuid()
      .notNull()
      .references(() => predictions.id),
    points: integer().notNull(),
    computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.predictionId)],
);
