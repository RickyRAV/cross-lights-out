import type { GroupResponse } from '@lightsout/shared';
import { AppError } from '../lib/errors';
import { generateInviteCode } from '../lib/invite-code';
import type { Group, GroupsRepository } from '../repositories/groups.repository';

export interface GroupsService {
  createGroup(userId: string, name: string): Promise<GroupResponse>;
  joinGroup(userId: string, inviteCode: string): Promise<GroupResponse>;
  listGroups(userId: string): Promise<GroupResponse[]>;
}

export function createGroupsService(deps: { groupsRepository: GroupsRepository }): GroupsService {
  return {
    async createGroup(userId, name) {
      const existing = await deps.groupsRepository.findByUserId(userId);
      if (existing.length > 0) {
        throw alreadyInGroup();
      }
      const group = await deps.groupsRepository.createWithCreator({
        name,
        inviteCode: generateInviteCode(),
        createdBy: userId,
      });
      if (!group) {
        throw alreadyInGroup();
      }
      return toGroupResponse(group);
    },

    async joinGroup(userId, inviteCode) {
      const group = await deps.groupsRepository.findByInviteCode(inviteCode);
      if (!group) {
        throw new AppError(404, 'InvalidInviteCode', 'No active group matches this invite code');
      }
      const [current] = await deps.groupsRepository.findByUserId(userId);
      if (current?.id === group.id) {
        return toGroupResponse(group);
      }
      if (current) {
        throw alreadyInGroup();
      }
      const added = await deps.groupsRepository.addMember(group.id, userId);
      if (!added && !(await deps.groupsRepository.isMember(group.id, userId))) {
        throw alreadyInGroup();
      }
      return toGroupResponse(group);
    },

    async listGroups(userId) {
      const groups = await deps.groupsRepository.findByUserId(userId);
      return groups.map(toGroupResponse);
    },
  };
}

function alreadyInGroup(): AppError {
  return new AppError(409, 'AlreadyInGroup', 'You are already in a friend group');
}

function toGroupResponse(group: Group): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    createdAt: group.createdAt.toISOString(),
  };
}
