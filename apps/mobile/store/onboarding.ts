import type { GroupResponse } from '@lightsout/shared';
import { create } from 'zustand';
import { useAuthStore } from '@/store/auth';

type OnboardingState = {
  createdGroup: GroupResponse | null;
  showCreatedGroup: (group: GroupResponse) => void;
  finish: () => void;
};

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  createdGroup: null,
  showCreatedGroup: (group) => set({ createdGroup: group }),
  finish: () => set({ createdGroup: null }),
}));

useAuthStore.subscribe((state) => {
  if (state.status === 'signedOut') useOnboardingStore.getState().finish();
});
