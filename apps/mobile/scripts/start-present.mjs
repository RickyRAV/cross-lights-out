import { execFileSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const url = process.argv.includes('--local')
  ? 'http://10.0.2.2:3004/api/v1'
  : 'https://lightsout-api.w11core.cc/present/api/v1';

const sdk = process.env.ANDROID_HOME ?? join(homedir(), 'Library', 'Android', 'sdk');
const adbPath = join(sdk, 'platform-tools', 'adb');
const emulatorPath = join(sdk, 'emulator', 'emulator');

const adb = (...args) => execFileSync(adbPath, args, { encoding: 'utf8' }).trim();
const tryAdb = (...args) => {
  try {
    return adb(...args);
  } catch {
    return '';
  }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runningEmulator() {
  return tryAdb('devices')
    .split('\n')
    .map((line) => line.split('\t'))
    .find(([serial, state]) => serial.startsWith('emulator-') && state === 'device')?.[0];
}

// Expo Go loses its native modules when it is opened on an emulator that is still booting,
// or on top of an old session, so boot fully and close Expo Go before Expo opens the app.
async function prepareEmulator() {
  let serial = runningEmulator();
  if (!serial) {
    const avd = execFileSync(emulatorPath, ['-list-avds'], { encoding: 'utf8' }).split('\n')[0];
    console.log(`Booting ${avd}...`);
    spawn(emulatorPath, ['-avd', avd, '-gpu', 'host'], { detached: true, stdio: 'ignore' }).unref();
    while (!(serial = runningEmulator())) await sleep(2000);
  }
  while (tryAdb('-s', serial, 'shell', 'getprop', 'sys.boot_completed') !== '1') await sleep(2000);
  await sleep(3000);
  adb('-s', serial, 'shell', 'am', 'force-stop', 'host.exp.exponent');
  adb('-s', serial, 'shell', 'appops', 'set', 'host.exp.exponent', 'SCHEDULE_EXACT_ALARM', 'allow');
  return serial;
}

const serial = await prepareEmulator();
console.log(`Present mode, API: ${url}`);
spawn('expo start --android --clear', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ANDROID_SERIAL: serial,
    EXPO_PUBLIC_API_URL: url,
    EXPO_PUBLIC_REMINDER_LEAD_MINUTES: '2',
  },
}).on('exit', (code) => process.exit(code ?? 0));
