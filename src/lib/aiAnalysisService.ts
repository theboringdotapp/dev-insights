import { AICodeFeedback, FeedbackFrequency, AggregatedFeedback } from "./types";

// Types for AI analysis
export interface AIAnalysisConfig {
  apiKey: string;
  provider: "openai" | "anthropic";
  model?: string;
}

export interface PRAnalysisResult {
  prId: number;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  feedback: AICodeFeedback;
  error?: string;
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
  "strengths": ["Strength 1", "Strength 2", ...],
  "areas_for_improvement": ["Area 1", "Area 2", ...],
  "growth_opportunities": ["Opportunity 1", "Opportunity 2", ...],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Follow these important guidelines:
1. Each item should begin with a capital letter
2. Focus on substantial issues that impact the developer's growth
3. Be specific in your feedback - identify exactly what the developer is doing well or could improve
4. Connect each point to career development and professional growth
5. Provide actionable insights that will help the developer improve

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

    // Handle possible content issues with more robust parsing
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);

      // Try to extract JSON if it's embedded in other content
      const jsonMatch = content.match(/({[\s\S]*})/);
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
        // Provide fallback values if we can't parse the response
        return {
          strengths: ["The code shows potential for improvement"],
          areas_for_improvement: [
            "Unable to analyze PR details (parsing error)",
          ],
          growth_opportunities: [
            "Try another analysis or use a different model",
          ],
          career_impact_summary:
            "The analysis couldn't be completed due to parsing issues with the AI response.",
          overall_quality: 5,
        };
      }
    }

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

    // Return a fallback response instead of throwing
    return {
      strengths: ["The code appears to have some structure"],
      areas_for_improvement: ["Analysis failed due to an API error"],
      growth_opportunities: [
        "Try the analysis again with a different configuration",
      ],
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
  "strengths": ["Strength 1", "Strength 2", ...],
  "areas_for_improvement": ["Area 1", "Area 2", ...],
  "growth_opportunities": ["Opportunity 1", "Opportunity 2", ...],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Follow these important guidelines:
1. Each item should begin with a capital letter
2. Focus on substantial issues that impact the developer's growth
3. Be specific in your feedback - identify exactly what the developer is doing well or could improve
4. Connect each point to career development and professional growth
5. Provide actionable insights that will help the developer improve

Do not include any explanations or text outside of this JSON structure.
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
      return {
        strengths: ["The code shows potential for improvement"],
        areas_for_improvement: ["Unable to analyze PR details (parsing error)"],
        growth_opportunities: ["Try another analysis or use a different model"],
        career_impact_summary:
          "The analysis couldn't be completed due to issues with the AI response format.",
        overall_quality: 5,
      };
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];

    try {
      const parsedResponse = JSON.parse(jsonString);
      return {
        strengths: parsedResponse.strengths || [],
        areas_for_improvement:
          parsedResponse.areas_for_improvement ||
          parsedResponse.weaknesses ||
          [],
        growth_opportunities:
          parsedResponse.growth_opportunities ||
          parsedResponse.suggestions ||
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
      return {
        strengths: ["The code appears to have some structure"],
        areas_for_improvement: [
          "Analysis failed due to a response parsing error",
        ],
        growth_opportunities: [
          "Try the analysis again with a different configuration",
        ],
        career_impact_summary:
          "The code analysis could not be completed due to technical issues with the AI response format.",
        overall_quality: 5,
      };
    }
  } catch (error) {
    console.error("Error in Claude analysis:", error);
    return {
      strengths: ["The code appears to have some structure"],
      areas_for_improvement: ["Analysis failed due to an API error"],
      growth_opportunities: [
        "Try the analysis again with a different configuration",
      ],
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

  // Helper to count frequency of strings in an array, now tracking source PRs
  const countFrequency = (
    items: Array<{ text: string; prId: number; prUrl: string; prTitle: string }>
  ): FeedbackFrequency[] => {
    const groups: Record<
      string,
      {
        count: number;
        prIds: number[];
        prUrls: string[];
        prTitles: string[];
      }
    > = {};

    items.forEach((item) => {
      // Normalize the item text by lowercasing and trimming
      const normalized = item.text.toLowerCase().trim();

      if (!groups[normalized]) {
        groups[normalized] = {
          count: 0,
          prIds: [],
          prUrls: [],
          prTitles: [],
        };
      }

      groups[normalized].count++;

      // Only add the PR if it's not already in the list
      if (!groups[normalized].prIds.includes(item.prId)) {
        groups[normalized].prIds.push(item.prId);
        groups[normalized].prUrls.push(item.prUrl);
        groups[normalized].prTitles.push(item.prTitle);
      }
    });

    // Convert to array and sort by frequency
    return Object.entries(groups)
      .map(([text, { count, prIds, prUrls, prTitles }]) => ({
        text,
        count,
        prIds,
        prUrls,
        prTitles,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Limit to top 8 most common items
  };

  // Collect all feedback items with their PR sources
  const allStrengths: Array<{
    text: string;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allAreasForImprovement: Array<{
    text: string;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  const allGrowthOpportunities: Array<{
    text: string;
    prId: number;
    prUrl: string;
    prTitle: string;
  }> = [];
  let totalScore = 0;

  prAnalysisResults.forEach((result) => {
    result.feedback.strengths.forEach((strength) => {
      allStrengths.push({
        text: strength,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      });
    });

    result.feedback.areas_for_improvement.forEach((area) => {
      allAreasForImprovement.push({
        text: area,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      });
    });

    result.feedback.growth_opportunities.forEach((opportunity) => {
      allGrowthOpportunities.push({
        text: opportunity,
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
