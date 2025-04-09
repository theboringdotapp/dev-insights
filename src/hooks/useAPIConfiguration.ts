import { useState, useEffect } from "react";

// Local storage keys
const OPENAI_KEY_STORAGE = "github-review-openai-key";
const ANTHROPIC_KEY_STORAGE = "github-review-anthropic-key";

export function useAPIConfiguration() {
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">(
    "openai"
  );
  const [saveToken, setSaveToken] = useState(true);

  // Load saved API key when provider changes or on initial load
  useEffect(() => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey("");
    }
  }, [apiProvider]);

  // Handle clearing the saved API key
  const handleResetApiKey = () => {
    const storageKey =
      apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
    localStorage.removeItem(storageKey);
    setApiKey("");
  };

  // Change provider without losing saved token
  const handleProviderChange = (newProvider: "openai" | "anthropic") => {
    // If saveToken is enabled, save the current key before switching
    if (saveToken && apiKey) {
      const currentStorageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(currentStorageKey, apiKey);
    }

    // Update the provider
    setApiProvider(newProvider);
  };

  // Save the API key
  const saveApiKey = () => {
    if (saveToken && apiKey) {
      const storageKey =
        apiProvider === "openai" ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
      localStorage.setItem(storageKey, apiKey);
    }
  };

  return {
    apiKey,
    setApiKey,
    apiProvider,
    saveToken,
    setSaveToken,
    handleResetApiKey,
    handleProviderChange,
    saveApiKey,
  };
}
