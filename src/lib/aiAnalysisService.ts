import {
  AICodeFeedback,
  FeedbackFrequency,
  AggregatedFeedback,
  FeedbackItem,
  PRAnalysisResult,
  FeedbackInstance,
} from "./types";

// Types for AI analysis
export interface AIAnalysisConfig {
  apiKey: string;
  provider: "openai" | "anthropic";
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
 * Analyze a PR's code using OpenAI or Claude
 */
export async function analyzePRWithAI(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  try {
    if (config.provider === "openai") {
      return await analyzeWithOpenAI(prContent, config);
    } else {
      return await analyzeWithClaude(prContent, config);
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

/**
 * Analyze code with OpenAI
 */
async function analyzeWithOpenAI(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  // Use gpt-3.5-turbo instead as it better supports JSON mode
  const model = config.model || "gpt-3.5-turbo";

  const prompt = `
You are reviewing a GitHub pull request diff to provide constructive feedback for a developer's career growth.

Analyze this code diff and provide insights to help the developer progress from Junior to Regular level.

The PR details:
${prContent}

IMPORTANT: Your response MUST be a valid JSON object with the following structure ONLY:
{
  "strengths": [
    {
      "text": "Clear variable naming in function X.",
      "codeContext": {
        "filePath": "src/utils/helpers.ts",
        "startLine": 25,
        "endLine": 28,
        "codeSnippet": "..."
      }
    },
    { "text": "Good use of async/await." }
  ],
  "areas_for_improvement": [
    {
      "text": "Consider adding error handling for API call.",
      "codeContext": {
        "filePath": "src/services/api.ts",
        "startLine": 102,
        "endLine": 105,
        "codeSnippet": "..."
      }
    }
  ],
  "growth_opportunities": [
    {
      "text": "Explore using dependency injection for better testability.",
      "codeContext": {
        "filePath": "src/controllers/mainController.ts",
        "startLine": 15,
        "endLine": 20,
        "codeSnippet": "..."
      }
    },
    { "text": "Learn about SOLID principles." }
  ],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Follow these important guidelines:
1.  For each item in "strengths", "areas_for_improvement", and "growth_opportunities":
    *   Provide the feedback in the "text" field.
    *   If the feedback refers to a specific block of code within the provided diff, include a "codeContext" object.
    *   In "codeContext", provide the "filePath", the "startLine" and "endLine" numbers *from the diff* where the relevant code appears, and a brief "codeSnippet" (max 10 lines) of the referenced code. Use the line numbers indicated by '@@ ... @@' or the +/- prefixes in the diff.
    *   If a feedback item is general (e.g., "Learn about SOLID principles.") and doesn't refer to specific code in the diff, omit the "codeContext" field entirely for that item.
2.  Focus on substantial issues/points that impact the developer's growth.
3.  Be specific in your feedback - identify exactly what the developer is doing well or could improve, linking to code where possible.
4.  Connect each point to career development and professional growth.
5.  Provide actionable insights.

Do not include any explanations or text outside of this JSON structure.
`;

  try {
    const response = await fetch("/api/openai/v1/chat/completions", {
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
            content:
              "You are an expert code reviewer. Respond ONLY with valid JSON in the exact format requested.",
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
          areas_for_improvement: [],
          growth_opportunities: [],
          career_impact_summary:
            "The analysis couldn't be completed due to parsing issues with the AI response.",
          overall_quality: 5,
        };
      }
    }

    // Validate and structure the final response, providing defaults for the new structure
    return {
      strengths: parsedResponse.strengths || [],
      areas_for_improvement: parsedResponse.areas_for_improvement || [],
      growth_opportunities: parsedResponse.growth_opportunities || [],
      career_impact_summary:
        parsedResponse.career_impact_summary || "No summary provided",
      overall_quality: parsedResponse.overall_quality,
    };
  } catch (error) {
    console.error("Error in OpenAI analysis:", error);

    // Fallback for API errors, providing empty arrays for the new structure
    return {
      strengths: [],
      areas_for_improvement: [],
      growth_opportunities: [],
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
  const model = config.model || "claude-3-sonnet-20240229";

  const prompt = `
You are reviewing a GitHub pull request diff to provide constructive feedback for a developer's career growth.

Analyze this code diff and provide insights to help the developer progress from Junior to Regular level.

The PR details:
${prContent}

IMPORTANT: Your response MUST be a valid JSON object with the following structure ONLY:
{
  "strengths": [
    {
      "text": "Clear variable naming in function X.",
      "codeContext": {
        "filePath": "src/utils/helpers.ts",
        "startLine": 25,
        "endLine": 28,
        "codeSnippet": "..."
      }
    },
    { "text": "Good use of async/await." }
  ],
  "areas_for_improvement": [
    {
      "text": "Consider adding error handling for API call.",
      "codeContext": {
        "filePath": "src/services/api.ts",
        "startLine": 102,
        "endLine": 105,
        "codeSnippet": "..."
      }
    }
  ],
  "growth_opportunities": [
    {
      "text": "Explore using dependency injection for better testability.",
      "codeContext": {
        "filePath": "src/controllers/mainController.ts",
        "startLine": 15,
        "endLine": 20,
        "codeSnippet": "..."
      }
    },
    { "text": "Learn about SOLID principles." }
  ],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Follow these important guidelines:
1.  For each item in "strengths", "areas_for_improvement", and "growth_opportunities":
    *   Provide the feedback in the "text" field.
    *   If the feedback refers to a specific block of code within the provided diff, include a "codeContext" object.
    *   In "codeContext", provide the "filePath", the "startLine" and "endLine" numbers *from the diff* where the relevant code appears, and a brief "codeSnippet" (max 10 lines) of the referenced code. Use the line numbers indicated by '@@ ... @@' or the +/- prefixes in the diff.
    *   If a feedback item is general (e.g., "Learn about SOLID principles.") and doesn't refer to specific code in the diff, omit the "codeContext" field entirely for that item.
2.  Focus on substantial issues/points that impact the developer's growth.
3.  Be specific in your feedback - identify exactly what the developer is doing well or could improve, linking to code where possible.
4.  Connect each point to career development and professional growth.
5.  Provide actionable insights.

Do not include any explanations or text outside of this JSON structure. Respond ONLY with the JSON object.
`;

  try {
    const response = await fetch("/api/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-dangerous-direct-browser-access": "true",
        // Note: The "anthropic-version" header is already set in the proxy configuration
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No content in Claude response");
    }

    // Find the JSON in the response
    const jsonMatch =
      content.match(/```json\n([\s\S]*?)\n```/) ||
      content.match(/```\n([\s\S]*?)\n```/) ||
      content.match(/({[\s\S]*})/);

    if (!jsonMatch) {
      console.error(
        "No valid JSON found in Claude response, raw content:",
        content
      );
      // Fallback for parsing errors, providing empty arrays for the new structure
      return {
        strengths: [],
        areas_for_improvement: [],
        growth_opportunities: [],
        career_impact_summary:
          "The analysis couldn't be completed due to issues with the AI response format.",
        overall_quality: 5,
      };
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];

    try {
      const parsedResponse = JSON.parse(jsonString);
      // Validate and structure the final response, providing defaults for the new structure
      return {
        strengths: parsedResponse.strengths || [],
        areas_for_improvement:
          parsedResponse.areas_for_improvement ||
          parsedResponse.weaknesses || // Keep fallback for older formats if needed
          [],
        growth_opportunities:
          parsedResponse.growth_opportunities ||
          parsedResponse.suggestions || // Keep fallback for older formats if needed
          [],
        career_impact_summary:
          parsedResponse.career_impact_summary ||
          parsedResponse.summary ||
          "No summary provided",
        overall_quality:
          parsedResponse.overall_quality || parsedResponse.qualityScore,
      };
    } catch (error) {
      console.error("Failed to parse Claude response:", error);
      // Fallback for parsing errors, providing empty arrays for the new structure
      return {
        strengths: [],
        areas_for_improvement: [],
        growth_opportunities: [],
        career_impact_summary:
          "The code analysis could not be completed due to technical issues with the AI response format.",
        overall_quality: 5,
      };
    }
  } catch (error) {
    console.error("Error in Claude analysis:", error);
    // Fallback for API errors, providing empty arrays for the new structure
    return {
      strengths: [],
      areas_for_improvement: [],
      growth_opportunities: [],
      career_impact_summary:
        "The code analysis could not be completed due to technical issues with the Claude API.",
      overall_quality: 5,
    };
  }
}

/**
 * Aggregate feedback from multiple PRs to identify common patterns
 */
export function aggregateFeedback(
  prAnalysisResults: PRAnalysisResult[]
): AggregatedFeedback {
  if (!prAnalysisResults.length) {
    return {
      commonStrengths: [],
      commonWeaknesses: [],
      commonSuggestions: [],
      overallSummary: "No PRs have been analyzed yet.",
      averageScore: 0,
    };
  }

  // Helper to count frequency and collect instances with context
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
      {
        count: number;
        instances: FeedbackInstance[]; // Use the new structure
      }
    > = {};

    items.forEach(({ item, prId, prUrl, prTitle }) => {
      const normalized = item.text.toLowerCase().trim();

      if (!groups[normalized]) {
        groups[normalized] = {
          count: 0,
          instances: [], // Initialize instances array
        };
      }

      groups[normalized].count++;

      // Add a new instance for this specific occurrence
      groups[normalized].instances.push({
        prId,
        prUrl,
        prTitle,
        codeContext: item.codeContext, // Include the code context
      });
    });

    // Convert to array and sort by frequency
    return Object.entries(groups)
      .map(([text, { count, instances }]) => ({
        text, // This is the normalized text key
        count,
        instances, // Pass the collected instances
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Limit to top 8 most common items
  };

  // Collect all feedback items with their PR sources
  const allStrengths: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allAreasForImprovement: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allGrowthOpportunities: Array<{
    item: FeedbackItem;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  let totalScore = 0;

  prAnalysisResults.forEach((result) => {
    // Iterate through FeedbackItem[] and push the whole item
    result.feedback.strengths.forEach((strengthItem) => {
      allStrengths.push({
        item: strengthItem,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      });
    });

    result.feedback.areas_for_improvement.forEach((areaItem) => {
      allAreasForImprovement.push({
        item: areaItem,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      });
    });

    result.feedback.growth_opportunities.forEach((opportunityItem) => {
      allGrowthOpportunities.push({
        item: opportunityItem,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      });
    });

    if (typeof result.feedback.overall_quality === "number") {
      totalScore += result.feedback.overall_quality;
    }
  });

  // Calculate average score
  const averageScore =
    prAnalysisResults.length > 0 ? totalScore / prAnalysisResults.length : 0;

  // Identify common patterns
  const commonStrengths = countFrequency(allStrengths);
  const commonWeaknesses = countFrequency(allAreasForImprovement);
  const commonSuggestions = countFrequency(allGrowthOpportunities);

  // Generate overall summary based on analyzed PRs and career impact
  let overallSummary = "";
  if (averageScore >= 8) {
    overallSummary =
      "Excellent code quality overall. The developer shows strong potential for career advancement with consistently well-structured, maintainable code.";
  } else if (averageScore >= 6) {
    overallSummary =
      "Good code quality with clear strengths and growth potential. Addressing the identified areas for improvement will help progress from Junior to Regular developer.";
  } else if (averageScore >= 4) {
    overallSummary =
      "Average code quality with significant room for improvement. Focus on the suggested growth opportunities to build the skills needed for career advancement.";
  } else {
    overallSummary =
      "Below average code quality requiring targeted improvement. Addressing these fundamental issues is critical for career development.";
  }

  return {
    commonStrengths,
    commonWeaknesses,
    commonSuggestions,
    overallSummary,
    averageScore,
  };
}
