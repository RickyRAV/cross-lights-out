import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors';
import type { Group, GroupsRepository } from '../src/repositories/groups.repository';
import { createGroupsService } from '../src/services/groups.service';

function fakeGroupsRepository() {
  const groups: Group[] = [];
  const members: { groupId: string; userId: string }[] = [];

  function addMember(groupId: string, userId: string) {
    if (members.some((member) => member.userId === userId)) {
      return false;
    }
    members.push({ groupId, userId });
    return true;
  }

  const repository: GroupsRepository = {
    async createWithCreator(input) {
      const group: Group = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
      if (!addMember(group.id, input.createdBy)) {
        return undefined;
      }
      groups.push(group);
      return group;
    },
    async findByInviteCode(inviteCode) {
      return groups.find((group) => group.inviteCode === inviteCode);
    },
    async addMember(groupId, userId) {
      return addMember(groupId, userId);
    },
    async isMember(groupId, userId) {
      return members.some((member) => member.groupId === groupId && member.userId === userId);
    },
    async listMembers() {
      return [];
    },
    async findByUserId(userId) {
      const groupIds = members.filter((m) => m.userId === userId).map((m) => m.groupId);
      return groups.filter((group) => groupIds.includes(group.id));
    },
  };

  return { repository, groups, members };
}

describe('groups service', () => {
  it('creates a group with the creator as its only member', async () => {
    const fake = fakeGroupsRepository();
    const service = createGroupsService({ groupsRepository: fake.repository });

    const group = await service.createGroup('user-1', 'Paddock Club');

    expect(fake.members).toEqual([{ groupId: group.id, userId: 'user-1' }]);
  });

  it('rejects creating a second group', async () => {
    const fake = fakeGroupsRepository();
    const service = createGroupsService({ groupsRepository: fake.repository });
    await service.createGroup('user-1', 'Paddock Club');

    await expect(service.createGroup('user-1', 'Another Club')).rejects.toMatchObject({
      statusCode: 409,
      code: 'AlreadyInGroup',
    });
    expect(fake.groups).toHaveLength(1);
  });

  it('rejects joining a group while already in a different one', async () => {
    const fake = fakeGroupsRepository();
    const service = createGroupsService({ groupsRepository: fake.repository });
    const other = await service.createGroup('user-2', 'Other Club');
    await service.createGroup('user-1', 'Paddock Club');

    await expect(service.joinGroup('user-1', other.inviteCode)).rejects.toBeInstanceOf(AppError);
    expect(fake.members.filter((m) => m.userId === 'user-1')).toHaveLength(1);
  });

  it('treats joining your own group again as a no-op', async () => {
    const fake = fakeGroupsRepository();
    const service = createGroupsService({ groupsRepository: fake.repository });
    const group = await service.createGroup('user-1', 'Paddock Club');

    const joined = await service.joinGroup('user-1', group.inviteCode);

    expect(joined.id).toBe(group.id);
    expect(fake.members).toHaveLength(1);
  });

  it('rejects the join when a concurrent join already put the user in another group', async () => {
    const fake = fakeGroupsRepository();
    const service = createGroupsService({ groupsRepository: fake.repository });
    const target = await service.createGroup('user-2', 'Paddock Club');
    const repository: GroupsRepository = {
      ...fake.repository,
      async findByUserId() {
        return [];
      },
      async addMember() {
        return false;
      },
    };

    await expect(
      createGroupsService({ groupsRepository: repository }).joinGroup('user-1', target.inviteCode),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
