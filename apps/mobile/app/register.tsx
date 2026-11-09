import { registerRequestSchema } from '@lightsout/shared';
import { Link } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/race-ui';
import { TextField } from '@/components/text-field';
import { useRegister } from '@/hooks/use-auth';
import { apiErrorMessage, invalidFields } from '@/lib/form-errors';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const register = useRegister();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    if (register.isPending) return;
    const body = { displayName: displayName.trim(), email: email.trim(), password };
    const fields = invalidFields(registerRequestSchema.safeParse(body));
    setInvalid(fields);
    if (fields.size > 0) return;
    register.mutate(body);
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-6 pb-7"
        contentContainerStyle={{ paddingTop: insets.top + 60 }}
      >
        <View className="gap-1">
          <Text accessibilityRole="header" className="text-xl font-bold text-foreground">
            Create account
          </Text>
          <Text className="text-[13px] text-muted">Start predicting with your friends</Text>
        </View>

        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ricky"
          error={
            invalid.has('displayName') ? 'Enter a display name of up to 64 characters.' : undefined
          }
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <TextField
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          error={invalid.has('email') ? 'Enter a valid email address.' : undefined}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          error={invalid.has('password') ? 'Use at least 8 characters.' : undefined}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {register.isError && (
          <Text accessibilityLiveRegion="polite" className="text-[13px] text-accent">
            {apiErrorMessage(register.error)}
          </Text>
        )}

        <ActionButton
          label={register.isPending ? 'Creating account…' : 'Create account'}
          accessibilityState={{ busy: register.isPending }}
          disabled={register.isPending}
          onPress={submit}
        />

        <View className="flex-row gap-1">
          <Text className="text-xs text-muted">Already have an account?</Text>
          <Link href="/sign-in" replace asChild>
            <Pressable accessibilityRole="link">
              <Text className="text-xs font-semibold text-accent">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
