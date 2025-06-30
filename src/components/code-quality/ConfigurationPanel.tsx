import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AIProvider,
  useAPIConfiguration,
} from "../../hooks/useAPIConfiguration";
import { fetchAvailableModels } from "../../lib/aiAnalysisService";
import { MODEL_OPTIONS } from "../../lib/models";
import { PullRequestItem } from "../../lib/types";

// Define available models for each provider (Updated List)
// const MODEL_OPTIONS: Record<AIProvider, { id: string; name: string }[]> = { ... }; // Removed constant definition

interface ConfigurationPanelProps {
  apiKey: string;
  apiProvider: AIProvider;
  selectedModel: string | undefined;
  setSelectedModel: (modelId: string | undefined) => void;
  saveToken: boolean;
  setSaveToken: (value: boolean) => void;
  handleProviderChange: (provider: AIProvider) => void;
  useAllPRs: boolean;
  handleToggleAllPRs: () => void;
  allPRs?: PullRequestItem[];
  pullRequests: PullRequestItem[];
  setIsConfigVisible: (visible: boolean) => void;
  setApiKey: (key: string) => void;
  handleResetApiKey: () => void;
  handleClearCache: () => Promise<void>;
  allAnalyzedPRIdsSize: number;
}

export default function ConfigurationPanel({
  apiKey,
  apiProvider,
  selectedModel,
  setSelectedModel,
  saveToken,
  setSaveToken,
  handleProviderChange,
  setIsConfigVisible,
  setApiKey,
  handleResetApiKey,
  handleClearCache,
  allAnalyzedPRIdsSize,
}: ConfigurationPanelProps) {
  // Get saveApiKey from the hook to save explicitly on button click
  const { saveApiKey } = useAPIConfiguration();

  // State for dynamic models
  const [availableModels, setAvailableModels] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // Effect to fetch models when provider changes or API key is entered
  useEffect(() => {
    const fetchModels = async () => {
      // Clear previous state
      setAvailableModels([]);
      setModelLoadError(null);

      // Only fetch for Claude/Anthropic for now
      if (apiProvider === "anthropic" && apiKey) {
        setIsLoadingModels(true);
        try {
          const models = await fetchAvailableModels(apiProvider, apiKey);
          setAvailableModels(models);

          // Don't reset the selected model here - let the user's selection persist
        } catch (error) {
          console.error("Error fetching models:", error);
          setModelLoadError(
            error instanceof Error ? error.message : "Failed to fetch models"
          );
          // Fall back to static models from MODEL_OPTIONS if fetch fails
          setAvailableModels(MODEL_OPTIONS[apiProvider] || []);
        } finally {
          setIsLoadingModels(false);
        }
      } else if (apiProvider && apiProvider !== "anthropic") {
        // For other providers, use static list for now
        setAvailableModels(MODEL_OPTIONS[apiProvider] || []);
      }
    };

    fetchModels();
  }, [apiProvider, apiKey]); // Removed selectedModel and setSelectedModel from dependencies

  // Handle model change - ensure a model is selected for the current provider
  const handleModelChange = (modelId: string) => {
    console.log("Selected model ID:", modelId);
    setSelectedModel(modelId);
  };

  // Get model options - either dynamic or static
  const currentModelOptions = availableModels;

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
      <div className="flex flex-col space-y-4">
        {/* Provider Selection */}
        <div className="w-full">
          <Label
            htmlFor="apiProviderSelect"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            AI Provider
          </Label>
          <Select
            value={apiProvider}
            onValueChange={(value) => {
              const newProvider = value as AIProvider;
              // Only reset model if actually changing to a different provider
              if (newProvider !== apiProvider) {
                handleProviderChange(newProvider);
                setSelectedModel(undefined);
              }
            }}
          >
            <SelectTrigger id="apiProviderSelect" className="w-full">
              <SelectValue placeholder="Select AI Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="gemini">Google (Gemini)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key Input - Moved before Model Selection */}
        {apiProvider && (
          <div className="w-full">
            <Label
              htmlFor="apiKeyInput"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              API Key
            </Label>
            <div className="flex items-center">
              <Input
                id="apiKeyInput"
                type="password"
                className="flex-1 text-sm"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${
                  apiProvider.charAt(0).toUpperCase() + apiProvider.slice(1)
                } API key`}
                aria-label={`${apiProvider} API Key`}
              />
              {apiKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetApiKey}
                  className="ml-1 text-gray-500 hover:text-gray-700 px-2"
                  title="Clear API key"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="mt-2 flex items-center">
              <Checkbox
                id="saveToken"
                checked={saveToken}
                onCheckedChange={(checked) => setSaveToken(Boolean(checked))}
              />
              <Label
                htmlFor="saveToken"
                className="ml-2 text-xs text-gray-500 cursor-pointer leading-tight"
              >
                Save API key locally
              </Label>
            </div>
          </div>
        )}

        {/* Model Selection - Now comes after API Key */}
        {apiProvider && (
          <div className="w-full">
            <Label
              htmlFor="modelSelect"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Model
              {isLoadingModels && (
                <Loader2 className="inline-block ml-1 h-3 w-3 animate-spin text-gray-500" />
              )}
            </Label>
            <Select
              value={selectedModel ?? ""} // Handle undefined case
              onValueChange={handleModelChange}
              disabled={!apiKey || isLoadingModels} // Disable if no API key or while loading
            >
              <SelectTrigger
                id="modelSelect"
                className={`w-full ${
                  !apiKey || isLoadingModels
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <SelectValue
                  placeholder={
                    !apiKey
                      ? "Enter API key first"
                      : isLoadingModels
                      ? "Loading models..."
                      : "Select a model"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {currentModelOptions.length > 0 ? (
                  currentModelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-sm text-gray-500">
                    {!apiKey
                      ? "Enter API key to load models"
                      : "No models available"}
                  </div>
                )}
              </SelectContent>
            </Select>
            {!apiKey && apiProvider === "anthropic" && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Models will load automatically after entering API key
              </p>
            )}
            {modelLoadError && apiKey && (
              <p className="text-xs text-amber-600 mt-1">{modelLoadError}</p>
            )}
            {!selectedModel &&
              apiProvider &&
              apiKey &&
              !isLoadingModels &&
              currentModelOptions.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Please select a model for {apiProvider}.
                </p>
              )}
          </div>
        )}
      </div>

      {/* Cache Management */}
      <div className="mt-3 border-t pt-3">
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          Cache Management
        </Label>

        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={allAnalyzedPRIdsSize === 0}
            className={`text-xs w-full ${
              allAnalyzedPRIdsSize === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-red-600 border-red-200 hover:bg-red-50"
            }`}
            title="Remove all cached PR analysis data"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear Cached Analysis ({allAnalyzedPRIdsSize})
          </Button>
          <p className="text-xs text-gray-500">
            Removes all cached analysis data
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-center border-t pt-3">
        <Button
          onClick={() => {
            saveApiKey(); // Explicitly save settings
            setIsConfigVisible(false); // Close the panel
          }}
          // Disable only if no provider, no key, or no model selected
          disabled={
            !apiProvider || !apiKey || !selectedModel || isLoadingModels
          }
          className="w-full"
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
