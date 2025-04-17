import { useState, useEffect } from "react";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";
const GEMINI_KEY_STORAGE = "github-review-gemini-key";

// Define the provider type explicitly
export type AIProvider = "openai" | "anthropic" | "gemini";

export function useAPIConfiguration() {
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<AIProvider>("openai");
  const [saveToken, setSaveToken] = useState(true);

  // Function to get the correct storage key based on provider
  const getStorageKey = (provider: AIProvider): string => {
    switch (provider) {
      case "openai":
        return OPENAI_KEY_STORAGE;
      case "anthropic":
        return ANTHROPIC_KEY_STORAGE;
      case "gemini":
        return GEMINI_KEY_STORAGE;
      default:
        // Should not happen with TypeScript, but good practice
        console.warn("Unknown API provider for storage key:", provider);
        return OPENAI_KEY_STORAGE; // Default fallback
    }
  };

  // Load saved API key when provider changes or on initial load
  useEffect(() => {
    const storageKey = getStorageKey(apiProvider);
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey("");
    }
  }, [apiProvider]);

  // Handle clearing the saved API key
  const handleResetApiKey = () => {
    const storageKey = getStorageKey(apiProvider);
    localStorage.removeItem(storageKey);
    setApiKey("");
  };

  // Change provider without losing saved token
  const handleProviderChange = (newProvider: AIProvider) => {
    // If saveToken is enabled, save the current key before switching
    if (saveToken && apiKey) {
      const currentStorageKey = getStorageKey(apiProvider);
      localStorage.setItem(currentStorageKey, apiKey);
    }

    // Update the provider
    setApiProvider(newProvider);
    // API key for the new provider will be loaded by the useEffect hook
  };

  // Save the API key
  const saveApiKey = () => {
    if (saveToken && apiKey) {
      const storageKey = getStorageKey(apiProvider);
      localStorage.setItem(storageKey, apiKey);
    }
  };

  // Update the key and potentially save it if saveToken is true
  const updateApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (saveToken) {
      const storageKey = getStorageKey(apiProvider);
      localStorage.setItem(storageKey, newKey);
    }
  };

  return {
    apiKey,
    setApiKey: updateApiKey, // Use the updated setter
    apiProvider,
    saveToken,
    setSaveToken,
    handleResetApiKey,
    handleProviderChange,
    saveApiKey, // This might be redundant now, but keep for compatibility if needed
  };
}
