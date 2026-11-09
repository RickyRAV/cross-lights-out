import type { RaceResponse } from '@lightsout/shared';

export function nextRace(races: RaceResponse[], now: number): RaceResponse | null {
  return races.reduce<RaceResponse | null>((next, race) => {
    const lockout = Date.parse(race.lockoutAt);
    if (!Number.isFinite(lockout) || lockout <= now) return next;
    return !next || lockout < Date.parse(next.lockoutAt) ? race : next;
  }, null);
}

export function latestClosedRace(races: RaceResponse[], now: number): RaceResponse | null {
  return races.reduce<RaceResponse | null>((latest, race) => {
    const lockout = Date.parse(race.lockoutAt);
    if (!Number.isFinite(lockout) || lockout > now) return latest;
    return !latest || lockout > Date.parse(latest.lockoutAt) ? race : latest;
  }, null);
}

export function countdownParts(lockoutAt: string, now: number) {
  const deadline = Date.parse(lockoutAt);
  const seconds = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  return [
    { label: 'Days', value: Math.floor(seconds / 86400) },
    { label: 'Hrs', value: Math.floor(seconds / 3600) % 24 },
    { label: 'Min', value: Math.floor(seconds / 60) % 60 },
    { label: 'Sec', value: seconds % 60 },
  ];
}
