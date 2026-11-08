import { loginRequestSchema } from '@lightsout/shared';
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
import { useLogin } from '@/hooks/use-auth';
import { authErrorMessage, invalidFields } from '@/lib/auth-form';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    if (login.isPending) return;
    const body = { email: email.trim(), password };
    const fields = invalidFields(loginRequestSchema.safeParse(body));
    setInvalid(fields);
    if (fields.size > 0) return;
    login.mutate(body);
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
            Welcome back
          </Text>
          <Text className="text-[13px] text-muted">Sign in to keep predicting</Text>
        </View>

        <TextField
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
          placeholder="••••••••"
          error={invalid.has('password') ? 'Enter your password.' : undefined}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {login.isError && (
          <Text accessibilityLiveRegion="polite" className="text-[13px] text-accent">
            {authErrorMessage(login.error)}
          </Text>
        )}

        <ActionButton
          label={login.isPending ? 'Signing in…' : 'Sign in'}
          accessibilityState={{ busy: login.isPending }}
          disabled={login.isPending}
          onPress={submit}
        />

        <View className="flex-row gap-1">
          <Text className="text-xs text-muted">Don&apos;t have an account?</Text>
          <Link href="/register" replace asChild>
            <Pressable accessibilityRole="link">
              <Text className="text-xs font-semibold text-accent">Register</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
