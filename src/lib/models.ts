import { AIProvider } from "../hooks/useAPIConfiguration";

// Define available models for each provider (Curated List)
export const MODEL_OPTIONS: Record<AIProvider, { id: string; name: string }[]> =
  {
    openai: [
      { id: "gpt-4.1", name: "OpenAI GPT-4.1" },
      { id: "o4-mini", name: "OpenAI o4-mini" },
    ],
    anthropic: [
      { id: "claude-3-7-sonnet-20250219", name: "Anthropic Claude 3.7 Sonnet" },
    ],
    gemini: [
      { id: "gemini-2.5-pro-exp-03-25", name: "Google Gemini 2.5 Pro Exp" },
      { id: "models/gemini-1.5-pro", name: "Google Gemini 1.5 Pro" },
    ],
  };
