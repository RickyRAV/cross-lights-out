import { and, eq, TransactionRollbackError } from 'drizzle-orm';
import type { Database } from '../db/client';
import { friendGroups, groupMembers, users } from '../db/schema';
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

export interface GroupMember {
  userId: string;
  displayName: string;
}

export interface GroupsRepository {
  createWithCreator(group: NewGroup): Promise<Group | undefined>;
  findByInviteCode(inviteCode: string): Promise<Group | undefined>;
  addMember(groupId: string, userId: string): Promise<boolean>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  listMembers(groupId: string): Promise<GroupMember[]>;
  findByUserId(userId: string): Promise<Group[]>;
}

export function createGroupsRepository(db: Database): GroupsRepository {
  return {
    async createWithCreator(group) {
      try {
        return await db.transaction(async (tx) => {
          const created = firstRow(await tx.insert(friendGroups).values(group).returning());
          const added = await tx
            .insert(groupMembers)
            .values({ groupId: created.id, userId: group.createdBy })
            .onConflictDoNothing()
            .returning();
          if (added.length === 0) {
            tx.rollback();
          }
          return created;
        });
      } catch (error) {
        if (error instanceof TransactionRollbackError) {
          return undefined;
        }
        throw error;
      }
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
      const added = await db
        .insert(groupMembers)
        .values({ groupId, userId })
        .onConflictDoNothing()
        .returning();
      return added.length > 0;
    },
    async isMember(groupId, userId) {
      const [row] = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
        .limit(1);
      return row !== undefined;
    },
    async listMembers(groupId) {
      return db
        .select({ userId: users.id, displayName: users.displayName })
        .from(groupMembers)
        .innerJoin(users, eq(users.id, groupMembers.userId))
        .where(eq(groupMembers.groupId, groupId));
    },
    async findByUserId(userId) {
      return db
        .select({
          id: friendGroups.id,
          name: friendGroups.name,
          inviteCode: friendGroups.inviteCode,
          createdBy: friendGroups.createdBy,
          createdAt: friendGroups.createdAt,
        })
        .from(groupMembers)
        .innerJoin(friendGroups, eq(friendGroups.id, groupMembers.groupId))
        .where(eq(groupMembers.userId, userId));
    },
  };
}
