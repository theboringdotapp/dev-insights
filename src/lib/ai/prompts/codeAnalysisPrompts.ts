/**
 * Code Analysis Prompts
 *
 * This file contains all the prompts used for AI-powered code analysis
 * in the GitHub Review application. Centralizing these prompts makes it
 * easier to maintain and refine the analysis over time.
 *
 * === New Feedback Structure ===
 *
 * The feedback structure has been improved to provide clearer, more actionable insights:
 *
 * 1. strengths: Technical practices that demonstrate excellence (unchanged)
 *    - Focuses on positive patterns and good engineering practices
 *    - Recognizes strong code quality and implementation details
 *
 * 2. refinement_needs: Specific areas where the current code could be improved
 *    - Replaces the previous "areas_for_improvement" category
 *    - More focused on concrete, actionable code improvements
 *    - Addresses immediate technical debt and code quality issues
 *
 * 3. learning_pathways: Skills, concepts, or technologies for long-term growth
 *    - Replaces the previous "growth_opportunities" category
 *    - Focused on developer career progression rather than just code fixes
 *    - Suggests learning resources, patterns, and broader architectural concepts
 *
 * === Meta-Analysis ===
 *
 * This file also includes prompts for meta-analysis that identifies patterns across
 * multiple PR analyses. The meta-analysis provides:
 *
 * - Recurring patterns across PRs (strengths, refinements, learning areas)
 * - Development trajectory insights
 * - Focus areas for growth with specific action items
 * - Managerial insights to help team leads support the developer
 *
 * The design accommodates the needs of both developers (looking for specific
 * improvement areas) and managers (looking for patterns and growth trajectories).
 */

import { AIProvider } from "../../../hooks/useAPIConfiguration";

// Base template for PR code analysis
export const getPRAnalysisBasePrompt = (prContent: string): string => `
  You are an experienced software engineer tasked with reviewing a GitHub pull request (PR) to provide constructive feedback for a developer's career growth. Your goal is to analyze the code changes and offer insights that will help the developer improve their skills and advance in their career.

  The PR content has been structured to clearly separate what code was removed and what code was added for each file, making it easier to understand the changes:

  <pr_content>
  ${prContent}
  </pr_content>

  Please analyze this PR content carefully. Pay special attention to:
  - The "Removed Code" sections showing what was deleted
  - The "Added Code" sections showing what was implemented
  - The "Context" sections providing surrounding code for better understanding
  - The relationship between removed and added code to understand the nature of changes
  - **Coverage indicators** at the bottom showing if this is a complete or partial analysis
  - **Omitted Files Summary** if present, indicating what code changes were not included

  **IMPORTANT**: If you see indicators that this is a "Partial Analysis" or that files were omitted:
  - Acknowledge the incomplete context in your feedback
  - Focus your analysis on the files that were included
  - Avoid making broad generalizations about the entire PR
  - Note when analysis may be limited due to missing context

  Provide feedback in the following categories:

  1. Strengths: Highlight code practices that demonstrate technical excellence and good software engineering principles.
  2. Refinement Needs: Identify specific areas where the current code could be improved for better quality, maintainability, or performance.
  3. Learning Pathways: Suggest skills, concepts, or technologies the developer should learn to advance their career long-term.

  Instructions:
  1. Read through the PR content thoroughly.
  2. Create insights based on your learnings on the PR:
     - For each category (strengths, refinement needs, learning pathways):
       b. Rate each insight on a scale of 1-5 for impact on developer growth
       c. Select the top 2-3 insights based on the ratings
     - Consider the overall quality score based on the insights gathered
  3. For each selected insight:
     - If it's linked to a specific code block, include the relevant code snippet (max 10 lines)
     - If it's a general observation, omit the code context
  4. Evaluate the overall quality of the PR on a scale of 1-10, considering factors such as code clarity, efficiency, adherence to best practices, and potential impact on the project. Consider 10 as excellent. 1 as very poor quality.
  5. Format your response as a JSON object with the structure provided below.

  Important guidelines:
  - Consider the "importance" of the code reviewed, if the code is too simple or doesn't make meaningful changes in the code, don't try to provide insights for it.
  - It's acceptable and it is preferable to have zero insights for one or more categories if nothing significant stands out.
  - Only include insights that are highly valuable and impactful for the developer's growth.
  - Use the full range of scores (1-10) for the overall quality evaluation.
  - Always respond with the specified JSON structure, even if some sections are empty.

  Your response MUST be a valid JSON object with the following structure:

  {
    "strengths": [
      {
        "text": "Description of strength",
        "codeContext": {
          "filePath": "path/to/file",
          "startLine": X,
          "endLine": Y,
          "codeSnippet": "Relevant code (max 10 lines)"
        }
      }
    ],
    "refinement_needs": [
      {
        "text": "Description of needed refinement"
      }
    ],
    "learning_pathways": [
      {
        "text": "Suggested learning pathway",
        "codeContext": {
          "filePath": "path/to/file",
          "startLine": X,
          "endLine": Y,
          "codeSnippet": "Relevant code (max 10 lines)"
        }
      }
    ],
    "overall_quality": N,
    "analysis_completeness": {
      "is_complete": true/false,
      "limitation_note": "Optional note about analysis limitations if incomplete"
    }
  }

  Notes:
  - Include the "codeContext" object only when the feedback refers to a specific block of code within the provided diff.
  - The "startLine" and "endLine" numbers should refer to the line numbers in the diff, not the original file.
  - Omit the "codeContext" field entirely for general feedback items not tied to specific code.
  - Ensure that the "overall_quality" score (N) is a number between 1 and 10, reflecting a thoughtful evaluation of the PR's quality.

  Please proceed with your analysis and provide the JSON output as described. Do not include any explanations or text outside of this JSON structure.
`;

// Template for meta-analysis across multiple PRs
export const getMetaAnalysisPrompt = (allAnalysisData: string): string => `
  You are an experienced software development manager tasked with analyzing a developer's performance across multiple code reviews. Your goal is to identify patterns, provide actionable insights, and offer guidance for career development.

  First, review the following analysis data from multiple pull requests:

  <code_review_data>
  ${allAnalysisData}
  </code_review_data>

  1. List key metrics and observations from each pull request.
  2. Identify recurring themes across pull requests.
  3. Compare the developer's performance to industry standards.
  4. Consider the developer's strengths and areas for improvement.
  5. Brainstorm potential focus areas and career development opportunities.

  In your breakdown, consider the following:

  1. Current trends in software development and market demands
  2. Gaps in the current job market that could be relevant to the developer's growth
  3. Fundamental skills that are crucial but often overlooked by developers
  4. The relevance and usefulness of each identified pattern or insight

  For each insight, justify why it is extremely useful and relevant. Only include patterns and insights that meet this criteria. It's better to provide fewer, high-quality insights than to include less impactful ones.

  Provide your findings in the following JSON structure:

  {
    "recurring_patterns": [
      {
        "category": "strength" | "refinement" | "learning",
        "pattern_name": "Short descriptive name of the pattern",
        "description": "Detailed description of the recurring pattern",
        "frequency": "Qualitative assessment (e.g., 'very common', 'occasional')",
        "impact": "Assessment of the pattern's impact on code quality and developer growth"
      }
    ],
    "recommended_focus_areas": [
      {
        "area": "Name of focus area",
        "why": "Why this area should be prioritized",
        "resources": "Suggested resources or approaches for improvement"
      }
    ],
    "development_trajectory": {
      "current_level": "Assessment of current development level",
      "next_milestone": "Description of next career milestone",
      "key_actions": ["Action 1", "Action 2", "Action 3"]
    },
    "managerial_insights": {
      "strengths_to_leverage": "How the developer's strengths could be leveraged by the team",
      "growth_support": "How management can support growth in identified areas",
      "project_recommendations": "Types of projects that would benefit development"
    }
  }

  Ensure that your insights are actionable and relevant for both the developer and their manager in planning career development.
`;

// Provider-specific system messages
export const getSystemMessage = (provider: AIProvider): string => {
  switch (provider) {
    case "openai":
      return "You are an expert code reviewer. Respond ONLY with valid JSON in the exact format requested.";
    case "anthropic":
      return "You are an expert code reviewer analyzing code quality. Focus specifically on providing structured feedback in valid JSON format.";
    case "gemini":
      return "You are an advanced code analysis AI. Your task is to provide detailed code review feedback in the requested JSON format. Do not add any text outside the JSON structure.";
    default:
      return "You are an expert code reviewer. Respond ONLY with valid JSON in the exact format requested.";
  }
};
