import type { GroupResponse } from '@lightsout/shared';
import { AppError } from '../lib/errors';
import { generateInviteCode } from '../lib/invite-code';
import type { Group, GroupsRepository } from '../repositories/groups.repository';

export interface GroupsService {
  createGroup(userId: string, name: string): Promise<GroupResponse>;
  joinGroup(userId: string, inviteCode: string): Promise<GroupResponse>;
}

export function createGroupsService(deps: { groupsRepository: GroupsRepository }): GroupsService {
  return {
    async createGroup(userId, name) {
      const group = await deps.groupsRepository.create({
        name,
        inviteCode: generateInviteCode(),
        createdBy: userId,
      });
      await deps.groupsRepository.addMember(group.id, userId);
      return toGroupResponse(group);
    },

    async joinGroup(userId, inviteCode) {
      const group = await deps.groupsRepository.findByInviteCode(inviteCode);
      if (!group) {
        throw new AppError(404, 'InvalidInviteCode', 'No active group matches this invite code');
      }
      await deps.groupsRepository.addMember(group.id, userId);
      return toGroupResponse(group);
    },
  };
}

function toGroupResponse(group: Group): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    createdAt: group.createdAt.toISOString(),
  };
}
