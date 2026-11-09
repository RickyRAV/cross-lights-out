import { createGroupRequestSchema, joinGroupRequestSchema } from '@lightsout/shared';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/race-ui';
import { TextField } from '@/components/text-field';
import { useCreateGroup, useJoinGroup } from '@/hooks/use-groups';
import { apiErrorMessage, invalidFields } from '@/lib/form-errors';
import { useOnboardingStore } from '@/store/onboarding';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const createdGroup = useOnboardingStore((state) => state.createdGroup);

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 32 }}
      >
        {createdGroup ? (
          <GroupCreated name={createdGroup.name} inviteCode={createdGroup.inviteCode} />
        ) : (
          <CreateOrJoin />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CreateOrJoin() {
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const busy = createGroup.isPending || joinGroup.isPending;

  const create = () => {
    if (busy) return;
    const body = { name: name.trim() };
    const invalid = invalidFields(createGroupRequestSchema.safeParse(body)).size > 0;
    setNameInvalid(invalid);
    if (invalid) return;
    joinGroup.reset();
    createGroup.mutate(body);
  };

  const join = () => {
    if (busy) return;
    const body = { inviteCode: inviteCode.trim().toUpperCase() };
    const invalid = invalidFields(joinGroupRequestSchema.safeParse(body)).size > 0;
    setCodeInvalid(invalid);
    if (invalid) return;
    createGroup.reset();
    joinGroup.mutate(body);
  };

  return (
    <View className="gap-6">
      <View className="gap-1.5">
        <Text accessibilityRole="header" className="text-[22px] font-bold text-foreground">
          Join the grid
        </Text>
        <Text className="text-[13px] text-muted">
          Create your friend group or join one with an invite code. You can only be in one.
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-3.5 rounded-2xl bg-raised p-5">
          <Text className="text-xs font-semibold text-muted">Create a group</Text>
          <TextField
            inset
            label="Group name"
            value={name}
            onChangeText={setName}
            placeholder="The Paddock Club"
            error={nameInvalid ? 'Enter a group name of up to 64 characters.' : undefined}
            returnKeyType="go"
            onSubmitEditing={create}
          />
          {createGroup.isError && (
            <Text accessibilityLiveRegion="polite" className="text-[13px] text-accent">
              {apiErrorMessage(createGroup.error)}
            </Text>
          )}
          <ActionButton
            label={createGroup.isPending ? 'Creating group…' : 'Create group'}
            accessibilityState={{ busy: createGroup.isPending }}
            disabled={busy}
            onPress={create}
          />
        </View>

        <View className="gap-3.5 rounded-2xl bg-raised p-5">
          <Text className="text-xs font-semibold text-muted">Join a group</Text>
          <TextField
            inset
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="XK92F"
            error={codeInvalid ? 'Enter the invite code you were sent.' : undefined}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={join}
          />
          {joinGroup.isError && (
            <Text accessibilityLiveRegion="polite" className="text-[13px] text-accent">
              {apiErrorMessage(joinGroup.error)}
            </Text>
          )}
          <ActionButton
            label={joinGroup.isPending ? 'Joining group…' : 'Join group'}
            accessibilityState={{ busy: joinGroup.isPending }}
            disabled={busy}
            onPress={join}
          />
        </View>
      </View>
    </View>
  );
}

function GroupCreated({ name, inviteCode }: { name: string; inviteCode: string }) {
  const finish = useOnboardingStore((state) => state.finish);

  const share = () =>
    Share.share({
      message: `Join my Lights Out group "${name}" with the invite code ${inviteCode}`,
    }).catch(() => undefined);

  return (
    <View className="gap-6">
      <View className="gap-1.5">
        <Text accessibilityRole="header" className="text-[22px] font-bold text-foreground">
          Group created
        </Text>
        <Text className="text-[13px] text-muted">
          Send the invite code to your friends so they can join
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-3.5 rounded-2xl bg-raised p-5">
          <Text className="text-xs font-semibold text-muted">{name}</Text>
          <View className="gap-1.5">
            <Text className="text-xs font-medium text-muted">Invite code</Text>
            <View className="rounded-[10px] border border-border bg-background px-3.5 py-3">
              <Text
                selectable
                accessibilityLabel={`Invite code ${inviteCode.split('').join(' ')}`}
                className="text-[22px] font-bold tracking-[3px] text-foreground"
              >
                {inviteCode}
              </Text>
            </View>
          </View>
          <ActionButton label="Share invite code" onPress={share} />
        </View>
        <ActionButton secondary label="Continue" onPress={finish} />
      </View>
    </View>
  );
}
