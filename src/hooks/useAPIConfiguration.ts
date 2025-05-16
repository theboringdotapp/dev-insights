import { useState, useEffect, useCallback } from "react";
import { useAnalysisStore } from "../stores/analysisStore"; // Import Zustand store

// Local storage keys for API keys only
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

// Define the provider type explicitly (can be shared or kept here)
export type AIProvider = "openai" | "anthropic" | "gemini";

export function useAPIConfiguration() {
  // Read state and setters from Zustand store
  const apiProvider = useAnalysisStore((state) => state.apiProvider);
  const setApiProvider = useAnalysisStore((state) => state.setApiProvider);
  const apiKey = useAnalysisStore((state) => state.apiKey); // Read apiKey from store
  const setApiKey = useAnalysisStore((state) => state.setApiKey); // Get setApiKey action

  // Manage saveToken locally (or move to store if needed globally)
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
  }, []);

  // Load saved API key into the store when the provider changes
  useEffect(() => {
    const storageKey = getStorageKey(apiProvider);
    const savedKey = localStorage.getItem(storageKey);
    setApiKey(savedKey || ""); // Update store with loaded key
    console.log(
      `[useAPIConfiguration] Loaded API key for ${apiProvider} into store. Key length: ${
        savedKey?.length || 0
      }`
    );

    // Also load the saveToken preference
    const savedSaveToken = localStorage.getItem("github-review-save-token");
    if (savedSaveToken !== null) {
      setSaveToken(savedSaveToken === "true");
    }
  }, [apiProvider, getStorageKey, setApiKey]);

  // Handle clearing the currently active API key from store and storage
  const handleResetApiKey = useCallback(() => {
    const storageKey = getStorageKey(apiProvider);
    localStorage.removeItem(storageKey);
    setApiKey(""); // Update store
    console.log(`[useAPIConfiguration] Cleared API key for ${apiProvider}.`);
  }, [apiProvider, getStorageKey, setApiKey]);

  // Save the current API key from store (if saveToken is enabled)
  const saveApiKey = useCallback(() => {
    const currentApiKey = useAnalysisStore.getState().apiKey; // Get current key from store
    if (saveToken && currentApiKey) {
      const storageKey = getStorageKey(apiProvider);
      localStorage.setItem(storageKey, currentApiKey);
      console.log(`Saved API key for ${apiProvider}.`);
    } else if (saveToken && !currentApiKey) {
      // If saving is enabled but key is empty, remove from storage
      const storageKey = getStorageKey(apiProvider);
      localStorage.removeItem(storageKey);
    }
    // Save the saveToken preference globally
    localStorage.setItem("github-review-save-token", String(saveToken));
  }, [apiProvider, saveToken, getStorageKey]);

  // Update the store API key and potentially save it
  const updateApiKeyAndSave = useCallback(
    (newKey: string) => {
      setApiKey(newKey); // Update store
      if (saveToken) {
        const storageKey = getStorageKey(apiProvider);
        if (newKey) {
          localStorage.setItem(storageKey, newKey);
        } else {
          // Remove from storage if key is cleared
          localStorage.removeItem(storageKey);
        }
      }
    },
    [saveToken, apiProvider, getStorageKey, setApiKey]
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
      const currentApiKey = useAnalysisStore.getState().apiKey; // Get current key from store
      setSaveToken(shouldSave);
      localStorage.setItem("github-review-save-token", String(shouldSave));
      const storageKey = getStorageKey(apiProvider);
      if (shouldSave && currentApiKey) {
        // If enabling save and key exists, save it now
        localStorage.setItem(storageKey, currentApiKey);
      } else if (!shouldSave) {
        // If disabling saveToken, remove the currently loaded key from storage
        localStorage.removeItem(storageKey);
        console.log(
          `Removed API key for ${apiProvider} from storage as saveToken is disabled.`
        );
      }
    },
    [apiProvider, getStorageKey]
  );

  return {
    // Provide apiKey and setApiKey from the store
    apiKey,
    setApiKey: updateApiKeyAndSave, // Use the updated setter
    saveToken,
    setSaveToken: updateSaveToken,
    handleResetApiKey,
    handleProviderChange,
    saveApiKey, // Keep for explicit saving (e.g., on analyze button click)
  };
}
