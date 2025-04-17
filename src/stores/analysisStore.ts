import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AggregatedFeedback } from "../lib/types";
import { AIProvider } from "../hooks/useAPIConfiguration";

// Define the state structure
interface AnalysisState {
  analyzingPRIds: Set<number>;
  analysisSummary: AggregatedFeedback | null;
  allAnalyzedPRIds: Set<number>;
  selectedPRIds: Set<number>;
  apiProvider: AIProvider;
  selectedModel: string | undefined;
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
  setApiProvider: (provider: AIProvider) => void;
  setSelectedModel: (modelId: string | undefined) => void;
}

// Helper to handle Set serialization/deserialization for persist middleware
const jsonStorageWithSet = createJSONStorage(() => localStorage, {
  reviver: (key, value) => {
    if (
      key === "analyzingPRIds" ||
      key === "allAnalyzedPRIds" ||
      key === "selectedPRIds"
    ) {
      if (Array.isArray(value)) {
        return new Set(value);
      }
    }
    return value;
  },
  replacer: (key, value) => {
    if (
      key === "analyzingPRIds" ||
      key === "allAnalyzedPRIds" ||
      key === "selectedPRIds"
    ) {
      if (value instanceof Set) {
        return Array.from(value);
      }
    }
    return value;
  },
});

// Create the store with persistence
export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      // --- Initial State ---
      analyzingPRIds: new Set(),
      analysisSummary: null,
      allAnalyzedPRIds: new Set(),
      selectedPRIds: new Set(),
      apiProvider: "openai",
      selectedModel: undefined,

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
          analyzingPRIds: new Set(),
        }),

      setApiProvider: (provider) => set({ apiProvider: provider }),
      setSelectedModel: (modelId) => set({ selectedModel: modelId }),
    }),
    {
      name: "analysis-store",
      storage: jsonStorageWithSet,
      partialize: (state) => ({
        allAnalyzedPRIds: state.allAnalyzedPRIds,
        apiProvider: state.apiProvider,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
