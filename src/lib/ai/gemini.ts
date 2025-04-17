import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AI, GenerateOptions } from "../types";

export class Gemini implements AI {
  async generate(options: GenerateOptions): Promise<string> {
    const { prompt, apiKey, model, temperature } = options;

    if (!apiKey) {
      throw new Error("Gemini API key not set.");
    }

    try {
      // NOTE: API key is intentionally disclosed here for demonstration purposes.
      // DO NOT USE IN PRODUCTION without proper security measures (e.g., backend proxy).
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model: model,
        generationConfig: {
          temperature: temperature ?? 0.7, // Default temperature if not provided
        },
        // TODO: Add safetySettings if needed
      });

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error: unknown) {
      console.error("Error calling Gemini API:", error);
      let message = "Failed to generate text using Gemini.";
      if (error instanceof Error) {
        message = error.message;
      }
      // Check for specific CORS error patterns (this might need refinement)
      if (
        message.includes("CORS") ||
        message.includes("Access-Control-Allow-Origin")
      ) {
        throw new Error(
          "A CORS error occurred. Direct browser calls to the Gemini API might be blocked. Consider using a backend proxy."
        );
      }
      throw new Error(`Gemini API Error: ${message}`);
    }
  }
}
