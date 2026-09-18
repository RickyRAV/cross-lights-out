import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const friendGroups = pgTable('friend_groups', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  inviteCode: text().notNull().unique(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
