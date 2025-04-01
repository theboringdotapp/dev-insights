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
  const model = config.model || "gpt-4o-2024-08-06";

  const prompt = `
Here is the GitHub pull request diff you need to review:

<code_diff>
${prContent}
</code_diff>

You are an experienced senior developer tasked with reviewing code changes and providing constructive feedback to help junior developers progress in their careers. Your goal is to analyze the GitHub pull request diff and provide insights that will help the developer grow from a Junior to a Regular position.

Please analyze this code diff carefully, focusing on substantial issues that will have the most impact on the developer's growth and the overall quality of the codebase. Avoid nitpicking minor cosmetic issues unless they significantly affect readability or maintainability.

Before providing your final analysis, break down your thought process inside <code_review_analysis> tags. Consider the following aspects:

1. Code Structure and Organization: How well is the code structured? Are there opportunities to improve modularity or apply design patterns?
2. Performance and Efficiency: Are there any potential performance issues or opportunities for optimization?
3. Error Handling and Edge Cases: How well does the code handle potential errors or edge cases?
4. Scalability: Will this code scale well as the project grows?
5. Best Practices: Does the code follow industry best practices and coding standards?
6. Testing: Is the code testable? Are there opportunities to improve test coverage?

For each aspect:
a) Quote specific code snippets that are relevant to this aspect.
b) Evaluate positive points and areas for improvement.
c) Explicitly connect your observations to the developer's growth from Junior to Regular.

It's OK for this section to be quite long, as a thorough analysis will lead to better feedback.

After your analysis, provide your review in a structured JSON format with the following keys:
- strengths: Array of strengths in the code (focus on substantial, impactful aspects)
- areas_for_improvement: Array of weaknesses or potential issues that are important for career growth
- growth_opportunities: Array of specific suggestions for improvement that will help the developer progress
- career_impact_summary: A brief assessment of how addressing these points will contribute to career growth
- overall_quality: A numerical score from 1-10 (10 being excellent code), considering the developer's current level

Your JSON output should be parseable and follow this format exactly:

{
  "strengths": ["strength1", "strength2", ...],
  "areas_for_improvement": ["area1", "area2", ...],
  "growth_opportunities": ["opportunity1", "opportunity2", ...],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Please proceed with your analysis and review of the code diff.

`;

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
            "You are an expert code reviewer focused on code quality assessment.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
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

  try {
    const parsedResponse = JSON.parse(content);
    return {
      strengths: parsedResponse.strengths || [],
      areas_for_improvement: parsedResponse.areas_for_improvement || [],
      growth_opportunities: parsedResponse.growth_opportunities || [],
      career_impact_summary:
        parsedResponse.career_impact_summary || "No summary provided",
      overall_quality: parsedResponse.overall_quality,
    };
  } catch (e) {
    console.error("Failed to parse OpenAI response:", e);
    throw new Error("Failed to parse AI response");
  }
}

/**
 * Analyze code with Claude
 */
async function analyzeWithClaude(
  prContent: string,
  config: AIAnalysisConfig
): Promise<AICodeFeedback> {
  const model = config.model || "claude-3-7-sonnet-20250219";

  const prompt = `
Here is the GitHub pull request diff you need to review:

<code_diff>
${prContent}
</code_diff>

You are an experienced senior developer tasked with reviewing code changes and providing constructive feedback to help junior developers progress in their careers. Your goal is to analyze the GitHub pull request diff and provide insights that will help the developer grow from a Junior to a Regular position.

Please analyze this code diff carefully, focusing on substantial issues that will have the most impact on the developer's growth and the overall quality of the codebase. Avoid nitpicking minor cosmetic issues unless they significantly affect readability or maintainability.

Before providing your final analysis, break down your thought process inside <code_review_analysis> tags. Consider the following aspects:

1. Code Structure and Organization: How well is the code structured? Are there opportunities to improve modularity or apply design patterns?
2. Performance and Efficiency: Are there any potential performance issues or opportunities for optimization?
3. Error Handling and Edge Cases: How well does the code handle potential errors or edge cases?
4. Scalability: Will this code scale well as the project grows?
5. Best Practices: Does the code follow industry best practices and coding standards?
6. Testing: Is the code testable? Are there opportunities to improve test coverage?

For each aspect:
a) Quote specific code snippets that are relevant to this aspect.
b) Evaluate positive points and areas for improvement.
c) Explicitly connect your observations to the developer's growth from Junior to Regular.

It's OK for this section to be quite long, as a thorough analysis will lead to better feedback.

After your analysis, provide your review in a structured JSON format with the following keys:
- strengths: Array of strengths in the code (focus on substantial, impactful aspects)
- areas_for_improvement: Array of weaknesses or potential issues that are important for career growth
- growth_opportunities: Array of specific suggestions for improvement that will help the developer progress
- career_impact_summary: A brief assessment of how addressing these points will contribute to career growth
- overall_quality: A numerical score from 1-10 (10 being excellent code), considering the developer's current level

Your JSON output should be parseable and follow this format exactly:

{
  "strengths": ["strength1", "strength2", ...],
  "areas_for_improvement": ["area1", "area2", ...],
  "growth_opportunities": ["opportunity1", "opportunity2", ...],
  "career_impact_summary": "Summary of how addressing these points will help career progression",
  "overall_quality": 7
}

Please proceed with your analysis and review of the code diff.`;

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
      max_tokens: 2000,
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
    throw new Error("No valid JSON found in Claude response");
  }

  const jsonString = jsonMatch[1];

  try {
    const parsedResponse = JSON.parse(jsonString);
    return {
      strengths: parsedResponse.strengths || [],
      areas_for_improvement:
        parsedResponse.areas_for_improvement || parsedResponse.weaknesses || [],
      growth_opportunities:
        parsedResponse.growth_opportunities || parsedResponse.suggestions || [],
      career_impact_summary:
        parsedResponse.career_impact_summary ||
        parsedResponse.summary ||
        "No summary provided",
      overall_quality:
        parsedResponse.overall_quality || parsedResponse.qualityScore,
    };
  } catch (e) {
    console.error("Failed to parse Claude response:", e);
    throw new Error("Failed to parse AI response");
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

  // Helper to count frequency of strings in an array
  const countFrequency = (items: string[]): FeedbackFrequency[] => {
    const count: Record<string, number> = {};

    items.forEach((item) => {
      // Normalize the item by lowercasing and trimming
      const normalized = item.toLowerCase().trim();
      count[normalized] = (count[normalized] || 0) + 1;
    });

    // Convert to array and sort by frequency
    return Object.entries(count)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Limit to top 8 most common items
  };

  // Collect all feedback items
  const allStrengths: string[] = [];
  const allAreasForImprovement: string[] = [];
  const allGrowthOpportunities: string[] = [];
  let totalScore = 0;

  prAnalysisResults.forEach((result) => {
    allStrengths.push(...result.feedback.strengths);
    allAreasForImprovement.push(...result.feedback.areas_for_improvement);
    allGrowthOpportunities.push(...result.feedback.growth_opportunities);

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
