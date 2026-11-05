import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
    padding: 24,
    gap: 16,
  },
  title: { color: '#fafafa', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  description: { color: '#a1a1aa', fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
