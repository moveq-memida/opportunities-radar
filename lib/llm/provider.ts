import { DiffResult, extractChangeSummary } from "../differ";
import { Source } from "../db/schema";

export interface SummaryResult {
  title: string;
  bullets: string[];
  action?: string;
}

interface LLMProvider {
  name: string;
  summarize: (source: Source, diff: DiffResult) => Promise<SummaryResult>;
}

/**
 * Anthropic Claude provider
 */
const anthropicProvider: LLMProvider = {
  name: "anthropic",
  async summarize(source: Source, diff: DiffResult): Promise<SummaryResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }

    const { addedSections } = extractChangeSummary(diff);
    const changesText = addedSections.join("\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are summarizing updates from "${source.name}" (${source.category}).

New content added:
${changesText}

Provide a JSON response with:
- title: A concise title (max 80 chars)
- bullets: 2-4 key points as an array
- action: Optional recommended action (e.g., "Apply", "Vote", "Review")

Respond ONLY with valid JSON, no markdown.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    try {
      return JSON.parse(content);
    } catch {
      // Fallback parsing
      return fallbackSummary(source, diff);
    }
  },
};

/**
 * OpenAI GPT provider
 */
const openaiProvider: LLMProvider = {
  name: "openai",
  async summarize(source: Source, diff: DiffResult): Promise<SummaryResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    const { addedSections } = extractChangeSummary(diff);
    const changesText = addedSections.join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You summarize content updates into structured JSON. Respond only with valid JSON.",
          },
          {
            role: "user",
            content: `Summarize updates from "${source.name}" (${source.category}):

${changesText}

Return JSON with: title (max 80 chars), bullets (2-4 array), action (optional string like "Apply", "Vote")`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      return JSON.parse(content);
    } catch {
      return fallbackSummary(source, diff);
    }
  },
};

/**
 * Rule-based fallback summarizer
 */
function fallbackSummary(source: Source, diff: DiffResult): SummaryResult {
  const { addedSections } = extractChangeSummary(diff);

  // Generate title from first section
  let title = `${source.name} Update`;
  if (addedSections.length > 0) {
    const firstSection = addedSections[0];
    // Take first sentence or first 80 chars
    const match = firstSection.match(/^[^.!?]+[.!?]/);
    if (match && match[0].length <= 80) {
      title = match[0];
    } else {
      title = firstSection.slice(0, 77) + "...";
    }
  }

  // Generate bullets from sections
  const bullets = addedSections.slice(0, 4).map((section) => {
    // Take first sentence or truncate
    const match = section.match(/^[^.!?]+[.!?]/);
    if (match && match[0].length <= 150) {
      return match[0];
    }
    return section.slice(0, 147) + "...";
  });

  // Detect action from content
  const allText = addedSections.join(" ").toLowerCase();
  let action: string | undefined;

  if (allText.includes("apply")) action = "Apply";
  else if (allText.includes("vote")) action = "Vote";
  else if (allText.includes("register")) action = "Register";
  else if (allText.includes("submit")) action = "Submit";

  return { title, bullets, action };
}

/**
 * Get the appropriate LLM provider based on configuration
 */
function getProvider(): LLMProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropicProvider;
  }
  if (process.env.OPENAI_API_KEY) {
    return openaiProvider;
  }
  return null;
}

/**
 * Summarize changes using LLM or fallback to rules
 */
export async function summarizeChanges(
  source: Source,
  diff: DiffResult
): Promise<SummaryResult> {
  const provider = getProvider();

  if (provider) {
    try {
      return await provider.summarize(source, diff);
    } catch (error) {
      console.error(`LLM summarization failed: ${error}`);
      // Fall through to fallback
    }
  }

  return fallbackSummary(source, diff);
}
