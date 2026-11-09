import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from '@/store/auth';

type PredictionDraftState = {
  drafts: Record<string, string[]>;
  setDraft: (raceId: string, driverIds: string[]) => void;
  clearDraft: (raceId: string) => void;
};

export const usePredictionDraftStore = create<PredictionDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (raceId, driverIds) =>
        set((state) => ({ drafts: { ...state.drafts, [raceId]: driverIds } })),
      clearDraft: (raceId) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[raceId];
          return { drafts };
        }),
    }),
    {
      name: 'lightsout.predictionDrafts',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);

useAuthStore.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'signedOut') {
    usePredictionDraftStore.setState({ drafts: {} });
  }
});
