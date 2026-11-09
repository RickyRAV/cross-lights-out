import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import colors from '@/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="(predict)"
        options={{
          title: 'Predict',
          headerShown: false,
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="flag-outline"
              color={typeof color === 'string' ? color : colors.foreground}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="trophy-outline"
              color={typeof color === 'string' ? color : colors.foreground}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="time-outline"
              color={typeof color === 'string' ? color : colors.foreground}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              color={typeof color === 'string' ? color : colors.foreground}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
