import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text accessibilityRole="header" className="text-center text-3xl font-bold text-foreground">
        {title}
      </Text>
      <Text className="text-center text-base leading-6 text-muted">{description}</Text>
      {children}
    </View>
  );
}
