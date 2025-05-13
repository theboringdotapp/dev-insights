import {
  AICodeFeedback,
  FeedbackFrequency,
  AggregatedFeedback,
  FeedbackItem,
  PRAnalysisResult,
  FeedbackInstance,
} from "./types";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai"; // Import Gemini SDK

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

import { getPRAnalysisBasePrompt, getSystemMessage, getCareerDevelopmentPrompt, getMetaAnalysisPrompt } from "./ai/prompts/codeAnalysisPrompts";

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
      refinement_needs: parsedResponse.refinement_needs || parsedResponse.areas_for_improvement || [],
      learning_pathways: parsedResponse.learning_pathways || parsedResponse.growth_opportunities || [],
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
        // Increase max_tokens as 1000 seemed too low, causing truncation
        max_tokens: 2000, // Increased from 1000
        messages: [
          { role: "system", content: getSystemMessage("anthropic") },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
        refinement_needs: parsedResponse.refinement_needs || parsedResponse.areas_for_improvement || [],
        learning_pathways: parsedResponse.learning_pathways || parsedResponse.growth_opportunities || [],
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

  // Get the prompt from our centralized prompts
  const prompt = getPRAnalysisBasePrompt(prContent);

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

    // Make the API call
    const result = await geminiModel.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Attempt to parse the JSON response
    try {
      const parsedResponse = JSON.parse(responseText) as AICodeFeedback;
      // Basic validation: check if essential keys exist
      if (
        !parsedResponse ||
        !Array.isArray(parsedResponse.strengths) ||
        !Array.isArray(parsedResponse.refinement_needs || parsedResponse.areas_for_improvement) ||
        !Array.isArray(parsedResponse.learning_pathways || parsedResponse.growth_opportunities) ||
        typeof parsedResponse.career_impact_summary !== "string"
        // typeof parsedResponse.overall_quality !== 'number' // Allow optional quality
      ) {
        throw new Error("Gemini response JSON structure is invalid.");
      }
      return {
        strengths: parsedResponse.strengths || [],
        refinement_needs: parsedResponse.refinement_needs || parsedResponse.areas_for_improvement || [],
        learning_pathways: parsedResponse.learning_pathways || parsedResponse.growth_opportunities || [],
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
            !Array.isArray(parsedFallback.areas_for_improvement) ||
            !Array.isArray(parsedFallback.growth_opportunities) ||
            typeof parsedFallback.career_impact_summary !== "string"
          ) {
            throw new Error("Gemini fallback JSON structure is invalid.");
          }
          return {
            strengths: parsedFallback.strengths || [],
            areas_for_improvement: parsedFallback.areas_for_improvement || [],
            growth_opportunities: parsedFallback.growth_opportunities || [],
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
      career_impact_summary: "The code analysis could not be completed due to a Gemini API error.",
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
    const refinementItems = result.feedback.refinement_needs || result.feedback.areas_for_improvement || [];
    refinementItems.forEach((item) =>
      allRefinementNeeds.push({
        item,
        prId: result.prId,
        prUrl: result.prUrl,
        prTitle: result.prTitle,
      })
    );
    
    const learningItems = result.feedback.learning_pathways || result.feedback.growth_opportunities || [];
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

// --- Refactored function to ONLY generate the AI summary ---
// Renamed from aggregateFeedback
export async function generateAICareerSummary(
  // Takes the pre-calculated themes/score
  calculatedThemes: Omit<AggregatedFeedback, "careerDevelopmentSummary">,
  config: AIAnalysisConfig
): Promise<string> {
  // Returns only the summary string

  console.log(
    `[aiAnalysisService] Calling generateOverallCareerSummary for AI summary...`
  );

  // Call the existing internal function that makes the AI call
  // Pass the pre-calculated themes/score to it
  const careerDevelopmentSummary = await generateOverallCareerSummary(
    calculatedThemes,
    config
  );

  return careerDevelopmentSummary;
}

// Internal function: Generates the summary using AI (remains mostly the same)
async function generateOverallCareerSummary(
  aggregatedData: Omit<AggregatedFeedback, "careerDevelopmentSummary">,
  config: AIAnalysisConfig
): Promise<string> {
  const { commonStrengths, commonWeaknesses, commonSuggestions, averageScore } =
    aggregatedData;
  // ... formatItems, responsibilities ...
  const formatItems = (items: FeedbackFrequency[]) =>
    items.map((item) => `- ${item.text} (Count: ${item.count})`).join("\n") ||
    "None notable.";
  const strengthsText = formatItems(commonStrengths);
  const refinementNeedsText = formatItems(commonWeaknesses);
  const learningPathwaysText = formatItems(commonSuggestions);
  const responsibilities = `
- Compreende um codebase de forma ampla, tendo a percepção de como alterações podem afetar o todo;
- Implementa sem supervisão funcionalidades pequenas e médias;
- Implementa, com auxílio da equipe, funcionalidades de complexidade média, que tenham efeitos colaterais no código mas que não alterem o núcleo ou a arquitetura do projeto;
- Corrige a maior parte dos bugs;
- Escreve testes automatizados de baixa ou média complexidade e proativamente adiciona testes automatizados em partes críticas da aplicação, coerentes com o seu nível de conhecimento técnico;
- Executa testes manuais em uma funcionalidade garantindo que o happy-path e boa parte dos edge-cases estejam funcionando. As tarefas desenvolvidas raramente apresentam bugs;
- Realiza code-reviews em códigos de todas as complexidades garantindo que o happy-path e boa parte dos edge-cases estejam funcionando. As tarefas revisadas raramente apresentam bugs;
- Sabe dosar a meticulosidade do review de acordo com a complexidade da tarefa, sendo mais leniente quando cabível;
- Atenta-se para possíveis falhas de segurança que seu código pode inserir no codebase;
- Entende que partes do seu código podem não performar bem quando em escala;
- Tem a percepção de como uma alteração pontual no código pode desencadear efeitos colaterais em outras partes do código. Ativamente corrige ou mitiga esses efeitos colaterais que podem ocorrer;
- Preocupa-se com a legibilidade do código dos produtos, sugerindo onde o código de outros carbonautas pode ser escrito de uma forma mais legível;
- Percebe, aponta e sugere melhorias no código de outros carbonautas quando identifica códigos que não seguem as boas práticas de desenvolvimento e das linguagens utilizadas;
- Gerencia a sua própria rotina, sem supervisão, decidindo quais tarefas desenvolver de acordo com o seu nível de experiência e as necessidades da equipe;
- Percebe quando há dependências entre tarefas que podem travar a equipe e ativamente reorganiza-as para evitar bloqueio por dependência;
- Identifica e resolve ineficiências e redundâncias do dia-a-dia;
- Auxilia desenvolvedores com menos experiência no desenvolvimento e planejamento;
- Planeja o desenvolvimento de funcionalidades, com visão do curto prazo e com escopo limitado;
- Possui um mindset positivo e orientado a encontrar soluções;
- Comunica problemas técnicos e organizacionais de forma clara e objetiva, propondo soluções e formas de resolução;
- Comunica-se de forma clara e ativa, facilitando tomadas de decisões em discussões;
- Busca equilíbrio entre trabalho e bem-estar;
- Busca constantemente melhorias na performance da equipe;
- Contribui para o avanço dos conhecimentos técnicos da equipe;
- Prospera, com auxílio, em um ambiente de incertezas;
- Busca ativamente formas de melhorar os processos internos da Carbonaut;
- Promove ativamente os valores da Carbonaut dentro do ambiente de trabalho.
  `.trim();
  const prompt = `
You are assessing a developer's progress towards a 'Regular Developer' level based ONLY on aggregated feedback from multiple code reviews (pull requests).

**Aggregated Feedback:**
*Average Score (1-10):* ${averageScore.toFixed(1)}

*Common Strengths Found:*
${strengthsText}

*Common Refinement Needs Found:*
${refinementNeedsText}

*Common Learning Pathways Suggested:*
${learningPathwaysText}

**Responsibilities of a Regular Developer (for context):**
${responsibilities}

**Task:**
Write a concise summary (around 100-150 words) in English evaluating the developer's current trajectory towards the Regular Developer level based *strictly* on the aggregated feedback provided above. 
- Identify specific strengths from the feedback that align with the Regular Developer responsibilities.
- Identify key gaps or areas for development based on the common weaknesses and suggestions, relating them back to the responsibilities where possible.
- Conclude with a brief statement on their overall progress towards the Regular level based on this feedback.
- Do NOT invent information or make assumptions beyond the provided feedback data.
- Respond ONLY with the summary text, no preamble or extra formatting.
  `.trim();

  console.log(
    `[aiAnalysisService] Generating overall summary for ${config.provider}...`
  );
  try {
    let summaryText = "";
    if (config.provider === "openai") {
      // --- IMPLEMENTED OpenAI call ---
      const model = config.model;
      if (!model) {
        throw new Error(
          "OpenAI model not specified in config for summary generation."
        );
      }
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
              content: getSystemMessage(config.provider),
            },
            { role: "user", content: prompt }, // Use the constructed prompt
          ],
          temperature: 0.6, // Slightly lower temp for summary
          max_tokens: 500, // Summary should be shorter
          // No response_format needed, expecting text
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI summary generation API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      summaryText = data.choices?.[0]?.message?.content || "";
      // --- End OpenAI call ---
    } else if (config.provider === "anthropic") {
      summaryText = await generateClaudeText(prompt, config);
    } else if (config.provider === "gemini") {
      // ... (Gemini call) ...
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({
        model: config.model || "gemini-1.5-flash-latest",
      });
      const result = await model.generateContent(prompt);
      summaryText = result.response.text();
    } else {
      throw new Error(
        `Unsupported provider for summary generation: ${config.provider}`
      );
    }
    return summaryText.trim();
    } catch (error) {
      console.error("Error generating overall career summary:", error);
      return "(Could not generate AI career development summary due to an error.)";
    }
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
      const analysisData = prAnalysisResults.map(result => {
        const { prTitle, prId, feedback } = result;
        return `
  PR #${prId} - "${prTitle}":
  - Strengths: ${feedback.strengths.map(s => s.text).join("; ")}
  - Refinement Needs: ${(feedback.refinement_needs || feedback.areas_for_improvement || []).map(r => r.text).join("; ")}
  - Learning Pathways: ${(feedback.learning_pathways || feedback.growth_opportunities || []).map(o => o.text).join("; ")}
  - Quality Score: ${feedback.overall_quality || 'N/A'}
        `;
      }).join("\n\n");

      // Get the meta-analysis prompt with the formatted data
      const prompt = getMetaAnalysisPrompt(analysisData);

      let metaAnalysisText = "";
    
      // Choose API provider based on config
      if (config.provider === "openai") {
        // OpenAI implementation
        const response = await fetch("/api/openai/v1/chat/completions", {
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
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        metaAnalysisText = data.choices[0].message.content;
      } else if (config.provider === "anthropic") {
        // Anthropic implementation
        metaAnalysisText = await generateClaudeText(prompt, config, 3000);
      } else if (config.provider === "gemini") {
        // Gemini implementation
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({
          model: config.model || "gemini-1.5-flash-latest",
        });
        const result = await model.generateContent(prompt);
        metaAnalysisText = result.response.text();
      } else {
        throw new Error(`Unsupported provider for meta-analysis: ${config.provider}`);
      }

      // Parse the JSON response
      try {
        // Clean up the response to handle potential markdown or text formatting
        const cleanedText = metaAnalysisText.replace(/```json|```/g, '').trim();
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
