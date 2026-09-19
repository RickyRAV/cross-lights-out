import type { LeaderboardResponse } from '@lightsout/shared';
import { AppError } from '../lib/errors';
import type { GroupsRepository } from '../repositories/groups.repository';
import type { ScoresRepository } from '../repositories/scores.repository';

export interface LeaderboardService {
  getLeaderboard(userId: string, groupId: string): Promise<LeaderboardResponse>;
}

export function createLeaderboardService(deps: {
  groupsRepository: GroupsRepository;
  scoresRepository: ScoresRepository;
}): LeaderboardService {
  return {
    async getLeaderboard(userId, groupId) {
      const isMember = await deps.groupsRepository.isMember(groupId, userId);
      if (!isMember) {
        throw new AppError(403, 'NotAGroupMember', 'You are not a member of this group');
      }

      const members = await deps.groupsRepository.listMembers(groupId);
      const totals = await deps.scoresRepository.sumPointsByUserIds(
        members.map((member) => member.userId),
      );
      const totalsByUserId = new Map(totals.map((total) => [total.userId, total]));

      return members
        .map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          totalPoints: totalsByUserId.get(member.userId)?.totalPoints ?? 0,
          racesScored: totalsByUserId.get(member.userId)?.racesScored ?? 0,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);
    },
  };
}
