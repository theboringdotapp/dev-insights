import React from "react";
import { PullRequestItem } from "../../lib/types";
import { AIProvider } from "../../hooks/useAPIConfiguration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { MODEL_OPTIONS } from "../../lib/models";
import { useAPIConfiguration } from "../../hooks/useAPIConfiguration";

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
  useAllPRs,
  handleToggleAllPRs,
  allPRs,
  pullRequests,
  setIsConfigVisible,
  setApiKey,
  handleResetApiKey,
  handleClearCache,
  allAnalyzedPRIdsSize,
}: ConfigurationPanelProps) {
  // Get saveApiKey from the hook to save explicitly on button click
  const { saveApiKey } = useAPIConfiguration();

  // Handle model change - ensure a model is selected for the current provider
  const handleModelChange = (modelId: string) => {
    console.log("Selected model ID:", modelId);
    setSelectedModel(modelId);
  };

  // Get model options for the currently selected provider
  const currentModelOptions = MODEL_OPTIONS[apiProvider] || [];

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Selection */}
        <div>
          <Label
            htmlFor="apiProviderSelect"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            AI Provider
          </Label>
          <Select
            value={apiProvider}
            onValueChange={(value) => {
              handleProviderChange(value as AIProvider);
              // Reset model selection when provider changes
              setSelectedModel(undefined);
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

        {/* Model Selection - Conditional */}
        <div>
          <Label
            htmlFor="modelSelect"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Model
          </Label>
          <Select
            value={selectedModel ?? ""} // Handle undefined case
            onValueChange={handleModelChange}
            disabled={!apiProvider} // Disable if no provider selected
          >
            <SelectTrigger id="modelSelect" className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {currentModelOptions.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedModel && apiProvider && (
            <p className="text-xs text-red-600 mt-1">
              Please select a model for {apiProvider}.
            </p>
          )}
        </div>
      </div>

      {/* API Key Input */}
      <div className="mt-4">
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
            className="flex-1"
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
              className="ml-2 text-gray-500 hover:text-gray-700"
              title="Clear API key"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Reset
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
            className="ml-2 text-xs text-gray-500 cursor-pointer"
          >
            Save API key in browser for future sessions
          </Label>
        </div>
      </div>

      {/* Cache Management */}
      <div className="mt-4 border-t pt-4">
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          Cache Management
        </Label>

        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={allAnalyzedPRIdsSize === 0}
            className={`text-xs ${
              allAnalyzedPRIdsSize === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-red-600 border-red-200 hover:bg-red-50"
            }`}
            title="Remove all cached PR analysis data"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear All Cached Analysis
          </Button>
          <p className="ml-3 text-xs text-gray-500">
            Removes all cached analysis data to start fresh.
          </p>
        </div>
      </div>

      {/* Analyze Button -> Save Button */}
      <div className="mt-6 flex justify-end border-t pt-4">
        <Button
          onClick={() => {
            saveApiKey(); // Explicitly save settings
            setIsConfigVisible(false); // Close the panel
          }}
          // Disable only if no key or no model selected
          disabled={!apiKey || !selectedModel}
          size="lg"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
