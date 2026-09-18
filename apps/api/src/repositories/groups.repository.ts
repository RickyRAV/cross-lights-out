import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { friendGroups, groupMembers } from '../db/schema';
import { firstRow } from '../lib/db';

export interface NewGroup {
  name: string;
  inviteCode: string;
  createdBy: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
}

export interface GroupsRepository {
  create(group: NewGroup): Promise<Group>;
  findByInviteCode(inviteCode: string): Promise<Group | undefined>;
  addMember(groupId: string, userId: string): Promise<void>;
}

export function createGroupsRepository(db: Database): GroupsRepository {
  return {
    async create(group) {
      const rows = await db.insert(friendGroups).values(group).returning();
      return firstRow(rows);
    },
    async findByInviteCode(inviteCode) {
      const [row] = await db
        .select()
        .from(friendGroups)
        .where(eq(friendGroups.inviteCode, inviteCode))
        .limit(1);
      return row;
    },
    async addMember(groupId, userId) {
      await db.insert(groupMembers).values({ groupId, userId }).onConflictDoNothing();
    },
  };
}
