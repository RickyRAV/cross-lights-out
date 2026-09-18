import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { friendGroups } from './friend-groups';
import { users } from './users';

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid()
      .notNull()
      .references(() => friendGroups.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.userId] })],
);
