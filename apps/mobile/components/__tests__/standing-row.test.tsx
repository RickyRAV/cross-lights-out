import type { LeaderboardEntry } from '@lightsout/shared';
import { render, screen } from '@testing-library/react-native';
import { StandingRow } from '@/components/standing-row';
import { rankEntries } from '@/lib/leaderboard';

const entries: LeaderboardEntry[] = [
  { userId: 'u-nikola', displayName: 'Nikola Petrovic', totalPoints: 18, racesScored: 3 },
  { userId: 'u-ricky', displayName: 'Ricky', totalPoints: 24, racesScored: 1 },
  { userId: 'u-alex', displayName: 'Alex', totalPoints: 18, racesScored: 2 },
];

function renderStandings(me: string) {
  return render(
    <>
      {rankEntries(entries).map((entry) => (
        <StandingRow key={entry.userId} entry={entry} isMe={entry.userId === me} />
      ))}
    </>,
  );
}

describe('StandingRow', () => {
  it('renders each player with rank, initials, points and races scored', async () => {
    await renderStandings('u-ricky');

    expect(screen.getByText('Ricky')).toBeOnTheScreen();
    expect(screen.getByText('24')).toBeOnTheScreen();
    expect(screen.getByText('1 race scored')).toBeOnTheScreen();
    expect(screen.getByText('NP')).toBeOnTheScreen();
    expect(screen.getByText('3 races scored')).toBeOnTheScreen();
    expect(screen.getAllByText('You')).toHaveLength(1);
  });

  it('ranks by points, shares a rank on ties and marks the current user', async () => {
    await renderStandings('u-ricky');

    expect(screen.getByLabelText('Rank 1, Ricky, you, 24 points, 1 race scored')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rank 2, Alex, 18 points, 2 races scored')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Rank 2, Nikola Petrovic, 18 points, 3 races scored'),
    ).toBeOnTheScreen();
  });
});
