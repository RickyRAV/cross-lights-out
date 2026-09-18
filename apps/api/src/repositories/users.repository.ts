import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users } from '../db/schema';
import { firstRow } from '../lib/db';

export interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
}

export interface UsersRepository {
  create(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | undefined>;
}

export function createUsersRepository(db: Database): UsersRepository {
  return {
    async create(user) {
      const rows = await db.insert(users).values(user).returning();
      return firstRow(rows);
    },
    async findByEmail(email) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return row;
    },
  };
}
