import type { LeaderboardEntry } from '@lightsout/shared';

export type RankedEntry = LeaderboardEntry & { rank: number };

export function rankEntries(entries: LeaderboardEntry[]): RankedEntry[] {
  const sorted = [...entries].sort(
    (a, b) => b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName),
  );
  const ranked: RankedEntry[] = [];
  sorted.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const rank = previous && previous.totalPoints === entry.totalPoints ? previous.rank : index + 1;
    ranked.push({ ...entry, rank });
  });
  return ranked;
}

export function initials(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  const letters =
    words.length >= 2 ? [words[0]![0], words[1]![0]] : (words[0] ?? ['?']).slice(0, 2);
  return letters.join('').toUpperCase();
}

const otherPlayerColors = ['blue', 'orange'] as const;

export function chipColor(userId: string): (typeof otherPlayerColors)[number] {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return otherPlayerColors[hash % otherPlayerColors.length]!;
}
