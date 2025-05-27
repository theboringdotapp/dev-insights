import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai"; // Import Gemini SDK
import {
  AggregatedFeedback,
  AICodeFeedback,
  FeedbackFrequency,
  FeedbackInstance,
  FeedbackItem,
  MetaAnalysisResult,
  PRAnalysisResult,
} from "./types";

// Types for AI analysis
export interface AIAnalysisConfig {
  apiKey: string;
  provider: "openai" | "anthropic" | "gemini";
  model?: string;
}

/**
 * Format PR files data for analysis, ensuring it doesn't exceed token limits
 */
export function formatPRFilesForAnalysis(
  files: { filename: string; patch?: string }[],
  prTitle: string,
  prNumber: number
): string {
  let formattedContent = `PR #${prNumber}: ${prTitle}\n\nChanges:\n`;
  const MAX_TOKENS = 8000; // Conservative limit to leave room for response

  // First pass: Add all small files
  for (const file of files) {
    if (!file.patch) continue;

    // Skip very large files at first to prioritize smaller ones
    if (file.patch.length > 1000) continue;

    formattedContent += `\nFile: ${file.filename}\n${file.patch}\n`;

    // Check if we're approaching token limit
    if (formattedContent.length > MAX_TOKENS * 4) {
      // Rough char to token ratio
      formattedContent += "\n[Some files omitted due to size constraints]";
      break;
    }
  }

  // Second pass: Add parts of larger files if we have space
  if (formattedContent.length < MAX_TOKENS * 3) {
    for (const file of files) {
      if (!file.patch || file.patch.length <= 1000) continue;

      // Only include the first N characters of large files
      const excerpt =
        file.patch.substring(0, 800) + "\n[... rest of file omitted]";
      const potentialAddition = `\nFile: ${file.filename}\n${excerpt}\n`;

      if (formattedContent.length + potentialAddition.length < MAX_TOKENS * 4) {
        formattedContent += potentialAddition;
      } else {
        formattedContent +=
          "\n[Additional files omitted due to size constraints]";
        break;
      }
    }
  }

  return formattedContent;
}

/**
 * Analyze a PR's code using OpenAI, Claude, or Gemini
 */
export async function analyzePRWithAI(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  // Log the received config object immediately
  console.log(
    `[aiAnalysisService] analyzePRWithAI received config:`,
    JSON.stringify(config)
  );

  try {
    if (config.provider === "openai") {
      return await analyzeWithOpenAI(prContent, config);
    } else if (config.provider === "anthropic") {
      return await analyzeWithClaude(prContent, config);
    } else if (config.provider === "gemini") {
      return await analyzeWithGemini(prContent, config);
    } else {
      console.error(`Unsupported AI provider: ${config.provider}`);
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error(
      `AI analysis failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

import {
  getMetaAnalysisPrompt,
  getPRAnalysisBasePrompt,
  getSystemMessage,
} from "./ai/prompts/codeAnalysisPrompts";

/**
 * Analyze code with OpenAI
 */
async function analyzeWithOpenAI(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  // Ensure model is provided via config
  const model = config.model;
  if (!model) {
    throw new Error("OpenAI model not specified in config.");
  }

  const prompt = getPRAnalysisBasePrompt(prContent);

  try {
    // Determine if we're in production by checking the current URL
    const isProduction = window.location.hostname !== "localhost";
    const apiUrl = isProduction
      ? "https://api.openai.com/v1/chat/completions" // Direct API call in production
      : "/api/openai/v1/chat/completions"; // Use proxy in development

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: getSystemMessage("openai"),
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        throw new Error(
          `Cannot connect to OpenAI API (404 Not Found). If you're using our website, please use direct API URLs in production.`
        );
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    // Adjust parsing logic to handle the new structure
    // The structure itself is validated by the types, but ensure fallback handles it
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      const jsonMatch = content.match(/({[\\s\\S]*})/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } catch (error) {
          throw new Error(
            `Failed to parse embedded JSON in OpenAI response: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        // Fallback for parsing errors, providing empty arrays for the new structure
        return {
          strengths: [],
          refinement_needs: [],
          learning_pathways: [],
          career_impact_summary:
            "The analysis couldn't be completed due to parsing issues with the AI response.",
          overall_quality: 5,
        };
      }
    }

    // Validate and structure the final response, providing defaults for the new structure
    return {
      strengths: parsedResponse.strengths || [],
      refinement_needs:
        parsedResponse.refinement_needs ||
        parsedResponse.areas_for_improvement ||
        [],
      learning_pathways:
        parsedResponse.learning_pathways ||
        parsedResponse.growth_opportunities ||
        [],
      career_impact_summary:
        parsedResponse.career_impact_summary || "No summary provided",
      overall_quality: parsedResponse.overall_quality,
    };
  } catch (error) {
    console.error("Error in OpenAI analysis:", error);

    // Fallback for API errors, providing empty arrays for the new structure
    return {
      strengths: [],
      refinement_needs: [],
      learning_pathways: [],
      career_impact_summary:
        "The code analysis could not be completed due to technical issues.",
      overall_quality: 5,
    };
  }
}

/**
 * Analyze code with Claude
 */
async function analyzeWithClaude(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  // Ensure model is provided via config
  const model = config.model;
  if (!model) {
    throw new Error("Claude model not specified in config.");
  }

  const prompt = getPRAnalysisBasePrompt(prContent);

  try {
    // Determine if we're in production by checking the current URL
    const isProduction = window.location.hostname !== "localhost";
    const apiUrl = isProduction
      ? "https://api.anthropic.com/v1/messages" // Direct API call in production
      : "/api/anthropic/v1/messages"; // Use proxy in development

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-version": "2023-06-01", // Add this for production use
      },
      body: JSON.stringify({
        model,
        // Increase max_tokens as 1000 seemed too low, causing truncation
        max_tokens: 2000, // Increased from 1000
        messages: [
          { role: "system", content: getSystemMessage("anthropic") },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        throw new Error(
          `Cannot connect to Claude API (404 Not Found). If you're using our website, please use direct API URLs in production.`
        );
      }
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    // Extract the text content first
    const textContent = data.content?.[0]?.text;

    if (!textContent) {
      throw new Error("No text content found in Claude response");
    }

    // --- Robust JSON Parsing Logic ---
    let parsedResponse: AICodeFeedback | null = null;
    let parseError: unknown = null;
    let attemptedJsonString: string | null = textContent; // Start by attempting the full text content

    // 1. Try parsing the extracted text content directly
    try {
      parsedResponse = JSON.parse(textContent) as AICodeFeedback;
      console.log("Successfully parsed raw text content from Claude as JSON.");
    } catch (directParseError) {
      // 2. If direct parse fails, try extracting from markdown code block (as fallback)
      parseError = directParseError; // Store initial error
      console.log(
        "Raw text content not valid JSON, attempting markdown extraction as fallback."
      );
      const jsonMatch =
        textContent.match(/```json\n([\s\S]*?)\n```/) ||
        textContent.match(/```\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        attemptedJsonString = jsonMatch[1].trim();
        try {
          parsedResponse = JSON.parse(attemptedJsonString) as AICodeFeedback;
          console.log(
            "Successfully parsed JSON extracted from markdown fallback."
          );
          parseError = null; // Clear error if fallback succeeded
        } catch (extractionParseError) {
          parseError = extractionParseError; // Store the extraction parse error
          console.error(
            "Failed to parse extracted JSON from markdown fallback:",
            parseError
          );
        }
      } else {
        console.log("Could not find JSON markdown block in text content.");
      }
    }

    // 3. Check if parsing was successful at any stage
    if (parsedResponse) {
      // Validate and structure the final response (add null checks)
      return {
        strengths: parsedResponse.strengths || [],
        refinement_needs:
          parsedResponse.refinement_needs ||
          parsedResponse.areas_for_improvement ||
          [],
        learning_pathways:
          parsedResponse.learning_pathways ||
          parsedResponse.growth_opportunities ||
          [],
        career_impact_summary:
          parsedResponse.career_impact_summary || "No summary provided",
        overall_quality: parsedResponse.overall_quality,
      };
    } else {
      // 4. If parsing failed completely, throw an informative error
      console.error("Failed to parse Claude response after all attempts.");
      console.error("Original content received from Claude:", textContent);
      if (attemptedJsonString) {
        console.error(
          "Attempted to parse this extracted string:",
          attemptedJsonString
        );
      }
      throw new Error(
        `Failed to parse Claude response. Error: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`
      );
    }
  } catch (error) {
    console.error("Error in Claude analysis:", error);
    // Fallback for API errors, providing empty arrays for the new structure
    return {
      strengths: [],
      refinement_needs: [],
      learning_pathways: [],
      career_impact_summary:
        "The code analysis could not be completed due to technical issues with the Claude API.",
      overall_quality: 5,
    };
  }
}

/**
 * Helper function to generate simple text using the Claude API.
 */
async function generateClaudeText(
  prompt: string,
  config: AIAnalysisConfig,
  max_tokens = 500 // Allow overriding max_tokens, default to a reasonable value for summary
): Promise<string> {
  const model = config.model;
  if (!model) {
    throw new Error("Claude model not specified in config.");
  }

  try {
    const response = await fetch("/api/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens, // Use provided or default max tokens
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6, // Slightly lower temp for more factual summary
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const textContent = data.content?.[0]?.text;

    if (!textContent) {
      throw new Error("No text content found in Claude response");
    }

    return textContent.trim();
  } catch (error) {
    console.error("Error in generateClaudeText:", error);
    throw new Error(
      `Claude text generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Placeholder for the Gemini analysis function
/**
 * Analyze code with Gemini
 */
async function analyzeWithGemini(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  // Ensure model is provided via config
  const model = config.model;
  if (!model) {
    throw new Error("Gemini model not specified in config.");
  }
  // Default temperature (can be configured later if needed)
  const temperature = 0.7;

  try {
    // Initialize the Gemini client
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      // Basic safety settings - adjust as needed
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: temperature,
        // Explicitly ask for JSON output
        responseMimeType: "application/json",
      },
    });

    const prompt = getPRAnalysisBasePrompt(prContent);
    const systemMessage = getSystemMessage("gemini");

    // Combine system message and user prompt for Gemini
    const combinedPrompt = `${systemMessage}\n\nUser: ${prompt}`;

    // Make the API call
    const result = await geminiModel.generateContent(combinedPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Attempt to parse the JSON response
    try {
      const parsedResponse = JSON.parse(responseText) as AICodeFeedback;
      // Basic validation: check if essential keys exist
      if (
        !parsedResponse ||
        !Array.isArray(parsedResponse.strengths) ||
        !Array.isArray(
          parsedResponse.refinement_needs ||
            parsedResponse.areas_for_improvement
        ) ||
        !Array.isArray(
          parsedResponse.learning_pathways ||
            parsedResponse.growth_opportunities
        ) ||
        typeof parsedResponse.career_impact_summary !== "string"
        // typeof parsedResponse.overall_quality !== 'number' // Allow optional quality
      ) {
        throw new Error("Gemini response JSON structure is invalid.");
      }
      return {
        strengths: parsedResponse.strengths || [],
        refinement_needs:
          parsedResponse.refinement_needs ||
          parsedResponse.areas_for_improvement ||
          [],
        learning_pathways:
          parsedResponse.learning_pathways ||
          parsedResponse.growth_opportunities ||
          [],
        career_impact_summary:
          parsedResponse.career_impact_summary || "No summary provided.",
        overall_quality: parsedResponse.overall_quality, // Pass through if present
      };
    } catch (parseError: unknown) {
      console.error("Failed to parse Gemini JSON response:", parseError);
      console.error("Raw Gemini response text:", responseText);
      // Attempt to find JSON within ```json ... ``` blocks if parsing failed
      const jsonMatch =
        responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/```\n([\s\S]*?)\n```/) ||
        responseText.match(/({[\s\S]*})/); // Fallback to any object

      if (jsonMatch) {
        try {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          const parsedFallback = JSON.parse(jsonString) as AICodeFeedback;
          // Basic validation for fallback
          if (
            !parsedFallback ||
            !Array.isArray(parsedFallback.strengths) ||
            !Array.isArray(parsedFallback.refinement_needs) ||
            !Array.isArray(parsedFallback.learning_pathways) ||
            typeof parsedFallback.career_impact_summary !== "string"
          ) {
            throw new Error("Gemini fallback JSON structure is invalid.");
          }
          return {
            strengths: parsedFallback.strengths || [],
            learning_pathways: parsedFallback.learning_pathways || [],
            refinement_needs: parsedFallback.refinement_needs || [],
            career_impact_summary:
              parsedFallback.career_impact_summary || "No summary provided.",
            overall_quality: parsedFallback.overall_quality,
          };
        } catch (fallbackParseError) {
          console.error(
            "Failed to parse fallback Gemini JSON:",
            fallbackParseError
          );
          // Fall through to generic error if fallback parsing fails
        }
      }

      throw new Error(
        `Failed to parse Gemini response as valid JSON. Raw text: ${responseText.substring(
          0,
          200
        )}...`
      );
    }
  } catch (error: unknown) {
    console.error("Error calling Gemini API:", error);
    let message = "Failed to generate text using Gemini.";
    if (error instanceof Error) {
      message = error.message;
    }
    // Check for CORS errors
    if (
      message.includes("CORS") ||
      message.includes("Access-Control-Allow-Origin")
    ) {
      throw new Error(
        "A CORS error occurred. Direct browser calls to the Gemini API are likely blocked. Consider using a backend proxy or Vertex AI in Firebase."
      );
    }
    // Check for API key errors (example, adjust based on actual error messages)
    if (message.includes("API key not valid")) {
      throw new Error("Invalid Gemini API Key provided.");
    }

    // Provide fallback with new field names
    return {
      strengths: [],
      refinement_needs: [],
      learning_pathways: [],
      career_impact_summary:
        "The code analysis could not be completed due to a Gemini API error.",
      overall_quality: 5,
    };
  }
}

// --- Helper function to calculate common themes and score ---
function calculateCommonThemes(
  prAnalysisResults: PRAnalysisResult[]
): Omit<AggregatedFeedback, "careerDevelopmentSummary"> {
  if (!prAnalysisResults.length) {
    return {
      commonStrengths: [],
      commonWeaknesses: [],
      commonSuggestions: [],
      averageScore: 0,
    };
  }

  // Helper to count frequency (moved inside or kept accessible)
  const countFrequency = (
    items: Array<{
      item: FeedbackItem;
      prId: number;
      prUrl: string;
      prTitle: string;
    }>
  ): FeedbackFrequency[] => {
    const groups: Record<
      string,
      { count: number; instances: FeedbackInstance[] }
    > = {};
    items.forEach(({ item, prId, prUrl, prTitle }) => {
      // Add check for item and item.text being a string
      if (item && typeof item.text === "string") {
        const normalized = item.text.toLowerCase().trim();
        if (!groups[normalized]) {
          groups[normalized] = { count: 0, instances: [] };
        }
        groups[normalized].count++;
        groups[normalized].instances.push({
          prId,
          prUrl,
          prTitle,
          codeContext: item.codeContext,
        });
      } else {
        // Log a warning if an item is invalid
        console.warn(`[countFrequency] Skipping invalid feedback item:`, item);
      }
    });
    return Object.entries(groups)
      .map(([text, { count, instances }]) => ({ text, count, instances }))
      .sort((a, b) => b.count - a.count);
  };

  // Collect all feedback items (remains the same)
  const allStrengths: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allRefinementNeeds: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allLearningPathways: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  let totalScore = 0;
  prAnalysisResults.forEach((result) => {
    result.feedback.strengths.forEach((item) =>
      allStrengths.push({
        item,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      })
    );
    // Support both new field names and legacy field names
    const refinementItems =
      result.feedback.refinement_needs ||
      result.feedback.areas_for_improvement ||
      [];
    refinementItems.forEach((item) =>
      allRefinementNeeds.push({
        item,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      })
    );

    const learningItems =
      result.feedback.learning_pathways ||
      result.feedback.growth_opportunities ||
      [];
    learningItems.forEach((item) =>
      allLearningPathways.push({
        item,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      })
    );
    if (typeof result.feedback.overall_quality === "number") {
      totalScore += result.feedback.overall_quality;
    }
  });

  // Calculate score and common patterns
  const averageScore =
    prAnalysisResults.length > 0 ? totalScore / prAnalysisResults.length : 0;
  const commonStrengths = countFrequency(allStrengths);
  const commonWeaknesses = countFrequency(allRefinementNeeds);
  const commonSuggestions = countFrequency(allLearningPathways);

  return {
    commonStrengths,
    commonWeaknesses,
    commonSuggestions,
    averageScore,
  };
}

/**
 * Generate meta-analysis from multiple PR analyses
 * This function takes analyzed PR data and identifies patterns and insights across all PRs
 */
export async function generateMetaAnalysis(
  prAnalysisResults: PRAnalysisResult[],
  config: AIAnalysisConfig
): Promise<MetaAnalysisResult> {
  try {
    if (!prAnalysisResults || prAnalysisResults.length === 0) {
      throw new Error("No PR analysis data provided for meta-analysis");
    }

    // Format the PR analysis data for the AI prompt
    const analysisData = prAnalysisResults
      .map((result) => {
        const { prTitle, prId, feedback } = result;
        return `
  PR #${prId} - "${prTitle}":
  - Strengths: ${feedback.strengths.map((s) => s.text).join("; ")}
  - Refinement Needs: ${(
    feedback.refinement_needs ||
    feedback.areas_for_improvement ||
    []
  )
    .map((r) => r.text)
    .join("; ")}
  - Learning Pathways: ${(
    feedback.learning_pathways ||
    feedback.growth_opportunities ||
    []
  )
    .map((o) => o.text)
    .join("; ")}
  - Quality Score: ${feedback.overall_quality || "N/A"}
        `;
      })
      .join("\n\n");

    // Get the meta-analysis prompt with the formatted data
    const prompt = getMetaAnalysisPrompt(analysisData);

    let metaAnalysisText = "";

    // Choose API provider based on config
    if (config.provider === "openai") {
      // OpenAI implementation
      const isProduction = window.location.hostname !== "localhost";
      const apiUrl = isProduction
        ? "https://api.openai.com/v1/chat/completions" // Direct API call in production
        : "/api/openai/v1/chat/completions"; // Use proxy in development

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "gpt-4",
          messages: [
            {
              role: "system",
              content: getSystemMessage("openai"),
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          throw new Error(
            `Cannot connect to OpenAI API (404 Not Found). If you're using our website, please use direct API URLs in production.`
          );
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      metaAnalysisText = data.choices[0].message.content;
    } else if (config.provider === "anthropic") {
      // Anthropic implementation
      metaAnalysisText = await generateClaudeText(prompt, config, 3000);
    } else if (config.provider === "gemini") {
      // Gemini implementation
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const systemMessage = getSystemMessage("gemini"); // Get system message
      const model = genAI.getGenerativeModel({
        model: config.model || "gemini-1.5-flash-latest",
        generationConfig: {
          // Add generationConfig
          responseMimeType: "application/json",
          temperature: 0.6, // Match temperature with OpenAI for meta-analysis
        },
      });
      // Combine system message and user prompt
      const combinedPrompt = `${systemMessage}\n\nUser: ${prompt}`;
      const result = await model.generateContent(combinedPrompt);
      metaAnalysisText = result.response.text();
    } else {
      throw new Error(
        `Unsupported provider for meta-analysis: ${config.provider}`
      );
    }

    // Parse the JSON response
    try {
      // Clean up the response to handle potential markdown or text formatting
      const cleanedText = metaAnalysisText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing meta-analysis response:", parseError);
      throw new Error("Failed to parse meta-analysis result");
    }
  } catch (error) {
    console.error("Error generating meta-analysis:", error);
    throw error;
  }
}

// Export the new theme calculation function if needed elsewhere, or keep it internal
export { calculateCommonThemes };
