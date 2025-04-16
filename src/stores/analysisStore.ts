import { create } from "zustand";
import { AggregatedFeedback } from "../lib/types";

// Define the state structure
interface AnalysisState {
  analyzingPRIds: Set<number>;
  analysisSummary: AggregatedFeedback | null;
  allAnalyzedPRIds: Set<number>;
  selectedPRIds: Set<number>;
  // --- Actions ---
  startAnalysis: (prId: number) => void;
  completeAnalysis: (prId: number, newlyAnalyzed: boolean) => void;
  failAnalysis: (prId: number) => void;
  setAnalysisSummary: (summary: AggregatedFeedback | null) => void;
  addAnalyzedPRIds: (ids: number[]) => void;
  setSelectedPRIds: (ids: number[]) => void;
  toggleSelectedPR: (prId: number) => void;
  selectAllPRs: (ids: number[]) => void;
  clearAnalysisData: () => void;
}

// Create the store
export const useAnalysisStore = create<AnalysisState>((set) => ({
  // --- Initial State ---
  analyzingPRIds: new Set(),
  analysisSummary: null,
  allAnalyzedPRIds: new Set(),
  selectedPRIds: new Set(),

  // --- Actions Implementation ---
  startAnalysis: (prId) =>
    set((state) => ({
      analyzingPRIds: new Set(state.analyzingPRIds).add(prId),
    })),

  completeAnalysis: (prId, newlyAnalyzed) =>
    set((state) => {
      const newAnalyzing = new Set(state.analyzingPRIds);
      newAnalyzing.delete(prId);
      const newAnalyzed = newlyAnalyzed
        ? new Set(state.allAnalyzedPRIds).add(prId)
        : state.allAnalyzedPRIds;
      return {
        analyzingPRIds: newAnalyzing,
        allAnalyzedPRIds: newAnalyzed,
      };
    }),

  failAnalysis: (prId) =>
    set((state) => {
      const newAnalyzing = new Set(state.analyzingPRIds);
      newAnalyzing.delete(prId);
      return { analyzingPRIds: newAnalyzing };
    }),

  setAnalysisSummary: (summary) => set({ analysisSummary: summary }),

  addAnalyzedPRIds: (ids) =>
    set((state) => ({
      allAnalyzedPRIds: new Set([...state.allAnalyzedPRIds, ...ids]),
    })),

  setSelectedPRIds: (ids) => set({ selectedPRIds: new Set(ids) }),

  toggleSelectedPR: (prId) =>
    set((state) => {
      const newSelection = new Set(state.selectedPRIds);
      if (newSelection.has(prId)) {
        newSelection.delete(prId);
      } else {
        newSelection.add(prId);
      }
      return { selectedPRIds: newSelection };
    }),

  selectAllPRs: (ids) => {
    set((state) => {
      // Select only those IDs that have also been analyzed
      const analyzedIds = state.allAnalyzedPRIds;
      const selectableIds = ids.filter((id) => analyzedIds.has(id));
      return { selectedPRIds: new Set(selectableIds) };
    });
  },

  clearAnalysisData: () =>
    set({
      analysisSummary: null,
      allAnalyzedPRIds: new Set(),
      selectedPRIds: new Set(),
      // Note: analyzingPRIds is usually cleared by complete/fail actions,
      // but clearing here too ensures reset if cache is cleared mid-analysis.
      analyzingPRIds: new Set(),
    }),
}));
