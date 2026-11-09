import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, DriverChip } from '@/components/race-ui';

type PredictionConfirmationProps = {
  drivers?: readonly DriverResponse[];
  order: string[] | null;
  raceName: string;
  updating: boolean;
  busy: boolean;
  waitingForConnection: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PredictionConfirmation({
  drivers,
  order,
  raceName,
  updating,
  busy,
  waitingForConnection,
  onCancel,
  onConfirm,
}: PredictionConfirmationProps) {
  return (
    <Modal
      visible={order !== null}
      transparent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <SafeAreaView className="flex-1 items-center justify-center bg-background/80 p-6">
        <View
          accessibilityViewIsModal
          className="max-h-[85%] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <ScrollView contentContainerClassName="gap-5 p-6">
            <View className="gap-2">
              <Text accessibilityRole="header" className="text-2xl font-bold text-foreground">
                {updating ? 'Update prediction?' : 'Submit prediction?'}
              </Text>
              <Text className="text-sm text-muted">{raceName}</Text>
              <Text className="text-sm leading-5 text-muted">
                Check your finishing order. You can change your picks until lockout.
              </Text>
            </View>
            <View>
              {order?.map((code, index) => (
                <View
                  key={code}
                  className={`min-h-14 flex-row items-center gap-3 py-2 ${index < order.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <Text className="w-5 text-sm font-semibold text-muted">{index + 1}.</Text>
                  <DriverChip
                    code={code}
                    team={drivers?.find((driver) => driver.code === code)?.team}
                  />
                  <Text className="text-base font-semibold text-foreground">{code}</Text>
                </View>
              ))}
            </View>
            {waitingForConnection && (
              <Text accessibilityLiveRegion="polite" className="text-sm text-muted">
                Waiting for a connection. Your prediction has not been submitted yet.
              </Text>
            )}
            <ActionButton
              label={busy ? 'Submitting…' : 'Confirm prediction'}
              accessibilityState={{ busy }}
              disabled={busy}
              onPress={onConfirm}
            />
            <ActionButton secondary label="Keep editing" disabled={busy} onPress={onCancel} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
import type { DriverResponse } from '@lightsout/shared';
