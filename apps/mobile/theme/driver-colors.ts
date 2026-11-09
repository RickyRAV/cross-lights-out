// Driver affiliations come from the API. Only team presentation belongs here.
const teamStyles = {
  mercedes: { background: 'bg-team-mercedes', text: 'text-background' },
  ferrari: { background: 'bg-team-ferrari', text: 'text-on-accent' },
  redbull: { background: 'bg-team-red-bull', text: 'text-on-accent' },
  redbullracing: { background: 'bg-team-red-bull', text: 'text-on-accent' },
  mclaren: { background: 'bg-team-mclaren', text: 'text-background' },
  racingbulls: { background: 'bg-team-racing-bulls', text: 'text-background' },
  rb: { background: 'bg-team-racing-bulls', text: 'text-background' },
  alpine: { background: 'bg-team-alpine', text: 'text-background' },
  haas: { background: 'bg-team-haas', text: 'text-background' },
  haasf1team: { background: 'bg-team-haas', text: 'text-background' },
  audi: { background: 'bg-team-audi', text: 'text-on-accent' },
  williams: { background: 'bg-team-williams', text: 'text-background' },
  astonmartin: { background: 'bg-team-aston-martin', text: 'text-background' },
  cadillac: { background: 'bg-team-cadillac', text: 'text-background' },
};

export function driverChipStyle(team?: string | null) {
  const key = team?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key && Object.hasOwn(teamStyles, key)) {
    return teamStyles[key as keyof typeof teamStyles];
  }
  return { background: 'bg-raised', text: 'text-foreground' };
}
