import { create } from 'zustand';

type PredictionDraftState = {
  drafts: Record<string, string[]>;
  setDraft: (raceId: string, driverIds: string[]) => void;
  clearDraft: (raceId: string) => void;
};

export const usePredictionDraftStore = create<PredictionDraftState>()((set) => ({
  drafts: {},
  setDraft: (raceId, driverIds) =>
    set((state) => ({ drafts: { ...state.drafts, [raceId]: driverIds } })),
  clearDraft: (raceId) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[raceId];
      return { drafts };
    }),
}));
