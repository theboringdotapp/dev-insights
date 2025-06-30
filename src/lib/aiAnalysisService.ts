import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai"; // Import Gemini SDK
import { AIProvider } from "../hooks/useAPIConfiguration";
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
 * Parse a git diff patch into structured changes for better LLM comprehension
 */
function parseDiffPatch(patch: string): {
  removed: string[];
  added: string[];
  context: string[];
  metadata: {
    oldFile?: string;
    newFile?: string;
    fileMode?: string;
    hunks: number;
  };
} {
  const lines = patch.split('\n');
  const removed: string[] = [];
  const added: string[] = [];
  const context: string[] = [];
  const metadata: {
    oldFile?: string;
    newFile?: string;
    fileMode?: string;
    hunks: number;
  } = { hunks: 0 };

  for (const line of lines) {
    if (line.startsWith('---')) {
      metadata.oldFile = line.substring(4).trim();
    } else if (line.startsWith('+++')) {
      metadata.newFile = line.substring(4).trim();
    } else if (line.startsWith('@@')) {
      metadata.hunks++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed.push(line.substring(1));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      added.push(line.substring(1));
    } else if (line.startsWith(' ')) {
      context.push(line.substring(1));
    }
  }

  return { removed, added, context, metadata };
}

/**
 * Format a single file's changes in a structured, LLM-friendly format
 */
function formatFileChanges(filename: string, patch: string): string {
  const parsed = parseDiffPatch(patch);
  let output = `## File: ${filename}\n`;

  // Add metadata if significant
  if (parsed.metadata.hunks > 1) {
    output += `*${parsed.metadata.hunks} change sections*\n\n`;
  }

  // Format removed code
  if (parsed.removed.length > 0) {
    output += `### Removed Code:\n`;
    output += '```\n';
    output += parsed.removed.join('\n');
    output += '\n```\n\n';
  }

  // Format added code
  if (parsed.added.length > 0) {
    output += `### Added Code:\n`;
    output += '```\n';
    output += parsed.added.join('\n');
    output += '\n```\n\n';
  }

  // Add context if it helps understanding (limit to prevent bloat)
  if (parsed.context.length > 0 && parsed.context.length <= 10) {
    output += `### Context:\n`;
    output += '```\n';
    output += parsed.context.slice(0, 10).join('\n');
    if (parsed.context.length > 10) {
      output += '\n[... additional context omitted]';
    }
    output += '\n```\n\n';
  }

  return output;
}

/**
 * Calculate file importance for prioritization in large PRs
 */
function calculateFileImportance(filename: string, patch: string): number {
  let score = 0;
  const parsed = parseDiffPatch(patch);
  
  // File type scoring
  if (filename.match(/\.(ts|tsx|js|jsx)$/)) score += 10; // Core logic files
  else if (filename.match(/\.(py|java|cpp|c|go|rs)$/)) score += 10; // Other core languages
  else if (filename.match(/\.(css|scss|less)$/)) score += 3; // Styling
  else if (filename.match(/\.(json|yaml|yml|toml)$/)) score += 5; // Config files
  else if (filename.match(/\.(md|txt)$/)) score += 1; // Documentation
  else if (filename.match(/test|spec/)) score += 7; // Test files
  
  // Change impact scoring
  const totalChanges = parsed.added.length + parsed.removed.length;
  if (totalChanges > 50) score += 8; // Large changes likely important
  else if (totalChanges > 20) score += 5;
  else if (totalChanges > 5) score += 3;
  
  // Path importance
  if (filename.includes('src/')) score += 3;
  if (filename.includes('lib/')) score += 3;
  if (filename.includes('components/')) score += 2;
  if (filename.includes('utils/')) score += 2;
  
  return score;
}

/**
 * Create intelligent summary for omitted files
 */
function createOmittedFilesSummary(omittedFiles: { filename: string; patch: string; importance: number }[]): string {
  if (omittedFiles.length === 0) return '';
  
  // Group by file type
  const byType: Record<string, typeof omittedFiles> = {};
  omittedFiles.forEach(file => {
    const ext = file.filename.split('.').pop() || 'other';
    if (!byType[ext]) byType[ext] = [];
    byType[ext].push(file);
  });
  
  let summary = '\n## Omitted Files Summary\n';
  summary += `*${omittedFiles.length} files were omitted due to size constraints. Here's what was excluded:*\n\n`;
  
  // Show top 5 most important omitted files
  const topOmitted = omittedFiles
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);
    
  summary += '### Most Significant Omitted Files:\n';
  topOmitted.forEach(file => {
    const parsed = parseDiffPatch(file.patch);
    summary += `- **${file.filename}**: ${parsed.added.length} additions, ${parsed.removed.length} deletions\n`;
  });
  
  // Show breakdown by file type
  summary += '\n### Omitted Files by Type:\n';
  Object.entries(byType).forEach(([type, files]) => {
    const totalChanges = files.reduce((sum, f) => {
      const parsed = parseDiffPatch(f.patch);
      return sum + parsed.added.length + parsed.removed.length;
    }, 0);
    summary += `- **${type}** files: ${files.length} files, ~${totalChanges} total changes\n`;
  });
  
  summary += '\n*Note: Analysis may be incomplete due to these omissions. Consider reviewing the full PR diff for complete context.*\n';
  
  return summary;
}

/**
 * Format PR files data for analysis with intelligent prioritization for large PRs
 */
export function formatPRFilesForAnalysis(
  files: { filename: string; patch?: string }[],
  prTitle: string,
  prNumber: number
): string {
  let formattedContent = `# PR #${prNumber}: ${prTitle}\n\n`;
  const MAX_TOKENS = 8000; // Conservative limit to leave room for response
  const CHAR_PER_TOKEN_ESTIMATE = 4; // Rough estimate
  const maxChars = MAX_TOKENS * CHAR_PER_TOKEN_ESTIMATE;

  // Filter and score files by importance
  const scoredFiles = files
    .filter(file => file.patch)
    .map(file => ({
      ...file,
      importance: calculateFileImportance(file.filename, file.patch!),
      formattedLength: formatFileChanges(file.filename, file.patch!).length
    }))
    .sort((a, b) => {
      // First sort by importance, then by size (smaller first for same importance)
      if (b.importance !== a.importance) return b.importance - a.importance;
      return a.formattedLength - b.formattedLength;
    });

  const processedFiles: typeof scoredFiles = [];
  const omittedFiles: typeof scoredFiles = [];
  let currentLength = formattedContent.length;

  // First pass: Include high-priority files that fit
  for (const file of scoredFiles) {
    const fileChanges = formatFileChanges(file.filename, file.patch!);
    
    if (currentLength + fileChanges.length <= maxChars) {
      formattedContent += fileChanges;
      processedFiles.push(file);
      currentLength += fileChanges.length;
    } else {
      omittedFiles.push(file);
    }
  }

  // Second pass: Try to include summaries of important omitted files
  const importantOmitted = omittedFiles.filter(f => f.importance >= 8);
  
  for (const file of importantOmitted) {
    const parsed = parseDiffPatch(file.patch!);
    const summary = `## File: ${file.filename}\n*High-priority file omitted - Summary: ${parsed.added.length} additions, ${parsed.removed.length} deletions*\n\n`;
    
    if (currentLength + summary.length <= maxChars) {
      formattedContent += summary;
      processedFiles.push(file);
      // Remove from omittedFiles array
      const index = omittedFiles.indexOf(file);
      if (index > -1) omittedFiles.splice(index, 1);
      currentLength += summary.length;
    }
  }

  // Add comprehensive summary of what was included/omitted
  let statusSummary = '\n---\n';
  
  if (omittedFiles.length === 0) {
    statusSummary += `✅ **Complete Analysis**: All ${processedFiles.length} changed files included.\n`;
  } else {
    statusSummary += `⚠️ **Partial Analysis**: ${processedFiles.length} of ${files.length} files included.\n`;
    statusSummary += `**Coverage**: ~${Math.round((processedFiles.length / files.length) * 100)}% of changed files analyzed.\n`;
    
    // Add important context about what's missing
    if (omittedFiles.some(f => f.importance >= 8)) {
      statusSummary += `🔥 **Important**: Some high-priority files were omitted and may affect analysis accuracy.\n`;
    }
  }
  
  formattedContent += statusSummary;
  
  // Add detailed summary of omitted files
  if (omittedFiles.length > 0) {
    // Filter out files without patch (shouldn't happen, but for type safety)
    const omittedWithPatches = omittedFiles.filter((f): f is typeof f & { patch: string } => !!f.patch);
    const omittedSummary = createOmittedFilesSummary(omittedWithPatches);
    if (currentLength + omittedSummary.length <= maxChars * 1.1) { // Allow slight overflow for summary
      formattedContent += omittedSummary;
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
      // Anthropic implementation - match OpenAI pattern
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
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model || "claude-3-sonnet-20240229",
          max_tokens: 3000, // Match the token limit from generateClaudeText
          messages: [
            { role: "system", content: getSystemMessage("anthropic") },
            { role: "user", content: prompt },
          ],
          temperature: 0.6, // Match temperature with OpenAI for meta-analysis
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
      const textContent = data.content?.[0]?.text;

      if (!textContent) {
        throw new Error("No text content found in Claude response");
      }

      metaAnalysisText = textContent;
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

/**
 * Fetch available models from Claude/Anthropic
 */
export async function fetchClaudeModels(
  apiKey: string
): Promise<{ id: string; name: string }[]> {
  try {
    const isProduction = window.location.hostname !== "localhost";
    const baseUrl = isProduction
      ? "https://api.anthropic.com/v1/models"
      : "/api/anthropic/v1/models";

    const allModels: { id: string; name: string }[] = [];
    let hasMore = true;
    let afterId: string | null = null;

    // Paginate through all available models
    while (hasMore) {
      const url = new URL(baseUrl, window.location.origin);
      if (afterId) {
        url.searchParams.append("after_id", afterId);
      }
      url.searchParams.append("limit", "100"); // Get max models per page

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true", // For browser requests
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key");
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch models: ${errorText}`);
      }

      const data = await response.json();

      // Transform the API response to our format
      if (data.data && Array.isArray(data.data)) {
        const models = data.data.map(
          (model: { id: string; display_name: string; type: string }) => ({
            id: model.id,
            name: model.display_name || model.id,
          })
        );
        allModels.push(...models);
      }

      // Check if there are more pages
      hasMore = data.has_more || false;
      afterId = data.last_id || null;
    }

    // Sort models by name for better UX (newest models typically have higher version numbers)
    return allModels.sort((a, b) => b.name.localeCompare(a.name));
  } catch (error) {
    console.error("Error fetching Claude models:", error);
    throw error;
  }
}

/**
 * Fetch available models based on provider
 */
export async function fetchAvailableModels(
  provider: AIProvider,
  apiKey: string
): Promise<{ id: string; name: string }[]> {
  switch (provider) {
    case "anthropic":
      return fetchClaudeModels(apiKey);
    case "openai":
      // TODO: Implement OpenAI models fetching
      throw new Error("OpenAI model fetching not implemented yet");
    case "gemini":
      // TODO: Implement Gemini models fetching
      throw new Error("Gemini model fetching not implemented yet");
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
