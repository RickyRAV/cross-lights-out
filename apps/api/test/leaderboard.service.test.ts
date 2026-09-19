import { describe, expect, it } from 'vitest';
import type { GroupsRepository } from '../src/repositories/groups.repository';
import type { ScoresRepository, UserPoints } from '../src/repositories/scores.repository';
import { createLeaderboardService } from '../src/services/leaderboard.service';

function fakeGroupsRepository(
  members: { userId: string; displayName: string }[] = [],
): GroupsRepository {
  return {
    create: async () => {
      throw new Error('not used in this test');
    },
    findByInviteCode: async () => undefined,
    addMember: async () => {},
    isMember: async (_groupId, userId) => members.some((member) => member.userId === userId),
    listMembers: async () => members,
  };
}

function fakeScoresRepository(totals: UserPoints[]): ScoresRepository {
  return {
    insertMany: async () => {
      throw new Error('not used in this test');
    },
    async sumPointsByUserIds(userIds) {
      return totals.filter((total) => userIds.includes(total.userId));
    },
  };
}

describe('leaderboardService.getLeaderboard', () => {
  it('throws NotAGroupMember when the requester is not a member', async () => {
    const service = createLeaderboardService({
      groupsRepository: fakeGroupsRepository([{ userId: 'user-1', displayName: 'Racer One' }]),
      scoresRepository: fakeScoresRepository([]),
    });

    await expect(service.getLeaderboard('outsider', 'group-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'NotAGroupMember',
    });
  });

  it('ranks members by total points, highest first', async () => {
    const service = createLeaderboardService({
      groupsRepository: fakeGroupsRepository([
        { userId: 'user-1', displayName: 'Racer One' },
        { userId: 'user-2', displayName: 'Racer Two' },
      ]),
      scoresRepository: fakeScoresRepository([
        { userId: 'user-1', totalPoints: 11 },
        { userId: 'user-2', totalPoints: 30 },
      ]),
    });

    const leaderboard = await service.getLeaderboard('user-1', 'group-1');

    expect(leaderboard).toEqual([
      { userId: 'user-2', displayName: 'Racer Two', totalPoints: 30 },
      { userId: 'user-1', displayName: 'Racer One', totalPoints: 11 },
    ]);
  });

  it('includes members with no graded predictions yet at zero points', async () => {
    const service = createLeaderboardService({
      groupsRepository: fakeGroupsRepository([
        { userId: 'user-1', displayName: 'Racer One' },
        { userId: 'user-2', displayName: 'Racer Two' },
      ]),
      scoresRepository: fakeScoresRepository([{ userId: 'user-1', totalPoints: 5 }]),
    });

    const leaderboard = await service.getLeaderboard('user-1', 'group-1');

    expect(leaderboard).toEqual([
      { userId: 'user-1', displayName: 'Racer One', totalPoints: 5 },
      { userId: 'user-2', displayName: 'Racer Two', totalPoints: 0 },
    ]);
  });
});
