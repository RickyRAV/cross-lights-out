import { Pressable, Text, View, type PressableProps } from 'react-native';
import { driverChipStyle } from '@/theme/driver-colors';

type ChipColor = 'blue' | 'orange' | 'self';

const chipColors: Record<ChipColor, string> = {
  blue: 'bg-team-blue',
  orange: 'bg-team-orange',
  self: 'bg-avatar-default',
};

export function AvatarChip({ code, color = 'self' }: { code: string; color?: ChipColor }) {
  return (
    <View
      className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${chipColors[color]}`}
    >
      <Text className="text-[10px] font-semibold text-on-accent">{code}</Text>
    </View>
  );
}

type ActionButtonProps = Omit<PressableProps, 'children' | 'className' | 'style'> & {
  label: string;
  secondary?: boolean;
};

export function DriverChip({ code, team }: { code: string; team?: string | null }) {
  const style = driverChipStyle(team);
  return (
    <View
      className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.background}`}
    >
      <Text className={`text-[10px] font-semibold ${style.text}`}>{code}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  secondary = false,
  disabled,
  accessibilityState,
  ...props
}: ActionButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      className={`min-h-12 items-center justify-center rounded-[14px] px-5 py-3.5 active:opacity-70 ${disabled ? 'opacity-40' : ''} ${secondary ? 'border border-border' : 'bg-accent'}`}
    >
      <Text
        className={`text-center text-[15px] font-semibold ${secondary ? 'text-foreground' : 'text-on-accent'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusPill({
  label,
  variant = 'submitted',
}: {
  label: string;
  variant?: 'submitted' | 'score';
}) {
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${variant === 'submitted' ? 'bg-success-bg' : 'bg-accent-deep'}`}
    >
      <Text
        className={`text-[11px] font-semibold ${variant === 'submitted' ? 'text-success' : 'text-on-accent'}`}
      >
        {label}
      </Text>
    </View>
  );
}

type DriverRow = { code: string; team?: string | null };

export function DriverRows({
  picks,
  onPress,
}: {
  picks: DriverRow[];
  onPress?: (index: number) => void;
}) {
  return (
    <View>
      {picks.map((pick, index) => {
        const content = (
          <>
            <DriverChip code={pick.code} team={pick.team} />
            <Text className="text-[15px] font-semibold text-foreground">
              {index + 1}. {pick.code}
            </Text>
          </>
        );
        const className = `min-h-[81px] flex-row items-center gap-3 py-4 ${index < picks.length - 1 ? 'border-b border-border' : ''}`;
        return onPress ? (
          <Pressable
            key={pick.code}
            accessibilityRole="button"
            accessibilityLabel={`Change pick ${index + 1}, ${pick.code}`}
            onPress={() => onPress(index)}
            className={className}
          >
            {content}
          </Pressable>
        ) : (
          <View key={pick.code} className={className}>
            {content}
          </View>
        );
      })}
    </View>
  );
}
