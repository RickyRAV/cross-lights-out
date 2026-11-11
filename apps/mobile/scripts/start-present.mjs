import { spawn } from 'node:child_process';

const url = process.argv.includes('--local')
  ? 'http://10.0.2.2:3004/api/v1'
  : 'https://lightsout-api.w11core.cc/present/api/v1';

console.log(`Present mode, API: ${url}`);
spawn('expo', ['start', '--android', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_URL: url, EXPO_PUBLIC_REMINDER_LEAD_MINUTES: '2' },
}).on('exit', (code) => process.exit(code ?? 0));
