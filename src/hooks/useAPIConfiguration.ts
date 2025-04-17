import { useState, useEffect, useCallback } from "react";
import { useAnalysisStore } from "../stores/analysisStore"; // Import Zustand store

// Local storage keys for API keys only
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

// Define the provider type explicitly (can be shared or kept here)
export type AIProvider = "openai" | "anthropic" | "gemini";

export function useAPIConfiguration() {
  // Read provider state and setter from Zustand store
  const apiProvider = useAnalysisStore((state) => state.apiProvider);
  const setApiProvider = useAnalysisStore((state) => state.setApiProvider);

  // Manage API key state locally within the hook
  const [apiKey, setApiKey] = useState("");
  const [saveToken, setSaveToken] = useState(true);

  // Function to get the correct API key storage key based on provider
  const getStorageKey = useCallback((provider: AIProvider): string => {
    switch (provider) {
      case "openai":
        return OPENAI_KEY_STORAGE;
      case "anthropic":
        return ANTHROPIC_KEY_STORAGE;
      case "gemini":
        return GEMINI_KEY_STORAGE;
      default:
        console.warn("Unknown API provider for storage key:", provider);
        return OPENAI_KEY_STORAGE; // Default fallback
    }
  }, []); // No dependencies needed here

  // Load saved API key when the provider (from store) changes
  useEffect(() => {
    const storageKey = getStorageKey(apiProvider);
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
      console.log(
        `[useAPIConfiguration] Loaded API key for ${apiProvider}. Key length: ${savedKey.length}`
      );
    } else {
      setApiKey("");
      console.log(`[useAPIConfiguration] No API key found for ${apiProvider}.`);
    }
    // Also load the saveToken preference (assuming it's global for now)
    const savedSaveToken = localStorage.getItem("github-review-save-token");
    if (savedSaveToken !== null) {
      setSaveToken(savedSaveToken === "true");
    }
  }, [apiProvider, getStorageKey]);

  // Handle clearing the currently active API key
  const handleResetApiKey = useCallback(() => {
    const storageKey = getStorageKey(apiProvider);
    localStorage.removeItem(storageKey);
    setApiKey("");
    console.log(`[useAPIConfiguration] Cleared API key for ${apiProvider}.`);
  }, [apiProvider, getStorageKey]);

  // Save the current API key (if saveToken is enabled)
  const saveApiKey = useCallback(() => {
    if (saveToken && apiKey) {
      const storageKey = getStorageKey(apiProvider);
      localStorage.setItem(storageKey, apiKey);
      console.log(`Saved API key for ${apiProvider}.`);
    }
    // Save the saveToken preference globally
    localStorage.setItem("github-review-save-token", String(saveToken));
  }, [apiKey, apiProvider, saveToken, getStorageKey]);

  // Update the local API key state and potentially save it
  const updateApiKey = useCallback(
    (newKey: string) => {
      setApiKey(newKey);
      if (saveToken) {
        const storageKey = getStorageKey(apiProvider);
        localStorage.setItem(storageKey, newKey);
      }
    },
    [saveToken, apiProvider, getStorageKey]
  );

  // The function to change the provider now just calls the Zustand action
  const handleProviderChange = useCallback(
    (newProvider: AIProvider) => {
      console.log(`Provider change requested: ${newProvider}`);
      setApiProvider(newProvider);
      // The useEffect hook above will handle loading the key for the new provider
    },
    [setApiProvider]
  );

  // Update saveToken state and save preference
  const updateSaveToken = useCallback(
    (shouldSave: boolean) => {
      setSaveToken(shouldSave);
      localStorage.setItem("github-review-save-token", String(shouldSave));
      // If disabling saveToken, remove the currently loaded key from storage
      if (!shouldSave) {
        const storageKey = getStorageKey(apiProvider);
        localStorage.removeItem(storageKey);
        console.log(
          `Removed API key for ${apiProvider} from storage as saveToken is disabled.`
        );
      }
    },
    [apiProvider, getStorageKey]
  );

  return {
    apiKey,
    setApiKey: updateApiKey,
    // apiProvider is now read directly from useAnalysisStore where needed
    saveToken,
    setSaveToken: updateSaveToken, // Use updated setter
    handleResetApiKey,
    handleProviderChange, // This now dispatches to Zustand
    saveApiKey, // Keep for explicit saving if needed elsewhere
  };
}
