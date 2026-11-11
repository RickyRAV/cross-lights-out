// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import pluginQuery from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const useHooksMessage = 'Call the backend through a hook in @/hooks instead.';
const noExpoFetch = { name: 'expo/fetch', message: useHooksMessage };

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/expo-env.d.ts',
      'apps/api/drizzle/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended-strict'],
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/lib/api.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: useHooksMessage },
        { name: 'XMLHttpRequest', message: useHooksMessage },
      ],
      'no-restricted-imports': ['error', noExpoFetch],
    },
  },
  {
    files: ['apps/mobile/app/**/*.{ts,tsx}', 'apps/mobile/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        noExpoFetch,
        {
          name: '@/lib/api',
          importNames: ['apiRequest', 'nullIfNotFound'],
          message: 'Screens and components get server data from a hook in @/hooks.',
        },
      ],
    },
  },
  {
    files: ['**/*.config.js', 'apps/mobile/theme/*.js', '.pnpmfile.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['apps/mobile/scripts/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
