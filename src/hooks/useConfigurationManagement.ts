import { useCallback, useEffect, useState } from "react";
import { AIProvider } from "../hooks/useAPIConfiguration";
import { MODEL_OPTIONS } from "../lib/models";
import { useAnalysisStore } from "../stores/analysisStore";

interface UseConfigurationManagementProps {
  // Initial configuration values
  initialSaveToken?: boolean;
}

interface UseConfigurationManagementResult {
  // API configuration
  apiKey: string | null;
  saveToken: boolean;
  setApiKey: (key: string | null) => void;
  setSaveToken: (save: boolean) => void;
  saveApiKey: () => void;
  handleResetApiKey: () => void;

  // Provider and model management
  apiProvider: AIProvider;
  selectedModel: string | undefined;
  handleProviderChange: (provider: AIProvider) => void;
  setSelectedModel: (model: string | undefined) => void;

  // UI state
  isConfigVisible: boolean;
  setIsConfigVisible: (visible: boolean) => void;

  // Data selection
  useAllPRs: boolean;
  setUseAllPRs: (useAll: boolean) => void;
  maxPRs: number;
  setMaxPRs: (max: number) => void;
}

/**
 * Custom hook for managing API configuration, model selection, and UI state
 * related to the configuration panel.
 */
export function useConfigurationManagement({
  initialSaveToken = true,
}: UseConfigurationManagementProps = {}): UseConfigurationManagementResult {
  // Get API key from store instead of local state
  const {
    apiKey,
    setApiKey: storeSetApiKey,
    apiProvider,
    selectedModel,
    setApiProvider,
    setSelectedModel: storeSetSelectedModel,
  } = useAnalysisStore();

  // Local state for save token preference
  const [saveToken, setSaveToken] = useState<boolean>(initialSaveToken);

  // UI state for configuration panel
  const [isConfigVisible, setIsConfigVisible] = useState<boolean>(false);

  // Data selection state
  const [useAllPRs, setUseAllPRs] = useState<boolean>(false);
  const [maxPRs, setMaxPRs] = useState<number>(5);

  // Load saved token preference on mount
  useEffect(() => {
    const savedSaveToken = localStorage.getItem("github-review-save-token");
    if (savedSaveToken !== null) {
      setSaveToken(savedSaveToken === "true");
    }
  }, []);

  // Load API key from localStorage when provider changes
  useEffect(() => {
    const storageKey = `github-review-${apiProvider}-key`;
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      storeSetApiKey(savedKey);
      console.log(`[ConfigMgmt] Loaded saved API key for ${apiProvider}`);
    }
  }, [apiProvider, storeSetApiKey]);

  // Wrapper for setting API key that updates the store
  const setApiKey = useCallback(
    (key: string | null) => {
      console.log(`[ConfigMgmt] Setting API key, length: ${key?.length || 0}`);
      storeSetApiKey(key || "");
    },
    [storeSetApiKey]
  );

  // Handle provider change
  const handleProviderChange = useCallback(
    (provider: AIProvider) => {
      console.log(`[ConfigMgmt] Changing provider to: ${provider}`);

      // Update store with new provider
      setApiProvider(provider);

      // Skip auto-selection for providers that support dynamic model loading
      if (provider === "anthropic") {
        // For Anthropic, models are loaded dynamically
        console.log(
          `[ConfigMgmt] Skipping auto-selection for ${provider} (dynamic models)`
        );
        return;
      }

      // Auto-select first model if only one is available
      const models = MODEL_OPTIONS[provider] || [];
      if (models.length === 1) {
        storeSetSelectedModel(models[0].id);
        console.log(`[ConfigMgmt] Auto-selected model: ${models[0].id}`);
      } else if (
        selectedModel &&
        !models.map((m) => m.id).includes(selectedModel)
      ) {
        // Clear model selection if current model isn't compatible with new provider
        storeSetSelectedModel(undefined);
        console.log(
          `[ConfigMgmt] Cleared incompatible model: ${selectedModel}`
        );
      }
    },
    [setApiProvider, storeSetSelectedModel, selectedModel]
  );

  // Wrapper for setting selected model
  const setSelectedModel = useCallback(
    (model: string | undefined) => {
      console.log(`[ConfigMgmt] Setting model to: ${model || "none"}`);
      storeSetSelectedModel(model);
    },
    [storeSetSelectedModel]
  );

  // Effect to handle model auto-selection on provider change
  useEffect(() => {
    // Skip auto-selection for providers that support dynamic model loading
    if (apiProvider === "anthropic") {
      // For Anthropic, we load models dynamically, so don't auto-select from static list
      return;
    }

    const models = MODEL_OPTIONS[apiProvider] || [];
    const currentProviderModels = models.map((m) => m.id);

    if (models.length === 1) {
      // Auto-select if only one model exists and it's not already selected
      if (selectedModel !== models[0].id) {
        storeSetSelectedModel(models[0].id);
        console.log(
          `[ConfigMgmt] Auto-selected model for ${apiProvider}: ${models[0].id}`
        );
      }
    } else if (
      selectedModel &&
      !currentProviderModels.includes(selectedModel)
    ) {
      // Clear the selection if the currently selected model is incompatible
      storeSetSelectedModel(undefined);
      console.log(
        `[ConfigMgmt] Cleared incompatible model selection (${selectedModel}) for provider ${apiProvider}.`
      );
    }
  }, [apiProvider, selectedModel, storeSetSelectedModel]);

  // Save API key to localStorage if saveToken is true
  const saveApiKey = useCallback(() => {
    try {
      if (saveToken && apiKey) {
        const key = `github-review-${apiProvider}-key`;
        localStorage.setItem(key, apiKey);
        console.log(
          `[ConfigMgmt] Saved API key for ${apiProvider} to localStorage`
        );
      }
      // Save the saveToken preference
      localStorage.setItem("github-review-save-token", String(saveToken));
    } catch (error) {
      console.error("[ConfigMgmt] Error saving API key:", error);
    }
  }, [apiKey, apiProvider, saveToken]);

  // Reset API key
  const handleResetApiKey = useCallback(() => {
    try {
      storeSetApiKey("");
      const key = `github-review-${apiProvider}-key`;
      localStorage.removeItem(key);
      console.log(
        `[ConfigMgmt] Removed API key for ${apiProvider} from localStorage`
      );
    } catch (error) {
      console.error("[ConfigMgmt] Error removing API key:", error);
    }
  }, [apiProvider, storeSetApiKey]);

  return {
    apiKey,
    saveToken,
    setApiKey,
    setSaveToken,
    saveApiKey,
    handleResetApiKey,
    apiProvider,
    selectedModel,
    handleProviderChange,
    setSelectedModel,
    isConfigVisible,
    setIsConfigVisible,
    useAllPRs,
    setUseAllPRs,
    maxPRs,
    setMaxPRs,
  };
}
