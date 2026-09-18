import { randomBytes } from 'node:crypto';

export function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}
