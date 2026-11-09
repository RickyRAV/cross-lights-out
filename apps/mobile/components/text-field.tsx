import type { ComponentPropsWithRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import colors from '@/theme/colors';

type TextFieldProps = Omit<ComponentPropsWithRef<typeof TextInput>, 'className' | 'style'> & {
  label: string;
  error?: string;
  inset?: boolean;
};

export function TextField({ label, error, inset = false, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium text-muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.subtle}
        className={`h-11 rounded-[10px] border px-3.5 text-sm text-foreground ${inset ? 'bg-background' : 'bg-raised'} ${error ? 'border-accent' : 'border-border'}`}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-xs text-accent">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
