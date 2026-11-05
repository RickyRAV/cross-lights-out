import { DarkTheme } from 'expo-router';
import colors from './colors';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.foreground,
    border: colors.border,
  },
};
