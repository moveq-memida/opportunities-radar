import { DiffResult, extractChangeSummary } from "./differ";
import { Source } from "./db/schema";

export interface ScoreResult {
  score: number; // 0-100
  tags: string[];
  action?: string;
  deadline?: Date;
}

// Keywords that increase importance score
const HIGH_PRIORITY_KEYWORDS = [
  "deadline",
  "apply now",
  "closes",
  "last day",
  "urgent",
  "limited",
  "ending soon",
  "final",
  "announcement",
  "breaking",
  "major update",
  "new round",
  "funding",
  "grant",
  "application",
];

const MEDIUM_PRIORITY_KEYWORDS = [
  "update",
  "release",
  "launch",
  "upgrade",
  "proposal",
  "vote",
  "governance",
  "roadmap",
  "milestone",
  "partnership",
  "integration",
];

const ACTION_KEYWORDS = [
  "apply",
  "vote",
  "participate",
  "register",
  "sign up",
  "submit",
  "join",
  "claim",
];

// Tag extraction patterns
const TAG_PATTERNS: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\bgrant\b/i, tag: "grant" },
  { pattern: /\bfunding\b/i, tag: "funding" },
  { pattern: /\bgovernance\b/i, tag: "governance" },
  { pattern: /\bvote\b/i, tag: "vote" },
  { pattern: /\bproposal\b/i, tag: "proposal" },
  { pattern: /\bhackathon\b/i, tag: "hackathon" },
  { pattern: /\bbuilder\b/i, tag: "builder" },
  { pattern: /\bdeveloper\b/i, tag: "developer" },
  { pattern: /\binfrastructure\b/i, tag: "infrastructure" },
  { pattern: /\bdefi\b/i, tag: "defi" },
  { pattern: /\bnft\b/i, tag: "nft" },
  { pattern: /\bsecurity\b/i, tag: "security" },
  { pattern: /\bupgrade\b/i, tag: "upgrade" },
  { pattern: /\brelease\b/i, tag: "release" },
];

// Date patterns for deadline extraction
const DATE_PATTERNS = [
  /(?:deadline|closes?|ends?|due|by|before)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  /(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
];

/**
 * Scores and tags content changes based on importance
 */
export function scoreChanges(
  source: Source,
  diff: DiffResult,
  newContent: string
): ScoreResult {
  let score = 0;
  const tags = new Set<string>();
  let action: string | undefined;
  let deadline: Date | undefined;

  const { addedSections } = extractChangeSummary(diff);
  const textToAnalyze = addedSections.join(" ").toLowerCase();

  // Base score from source category
  switch (source.category) {
    case "grants":
      score += 20;
      tags.add("grant");
      break;
    case "governance":
      score += 15;
      tags.add("governance");
      break;
    case "protocol":
      score += 10;
      break;
    case "ecosystem":
      score += 5;
      break;
  }

  // Score based on amount of changes
  const changeLength = addedSections.reduce((sum, s) => sum + s.length, 0);
  if (changeLength > 1000) {
    score += 15;
  } else if (changeLength > 500) {
    score += 10;
  } else if (changeLength > 100) {
    score += 5;
  }

  // High priority keywords
  for (const keyword of HIGH_PRIORITY_KEYWORDS) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      score += 15;
      break;
    }
  }

  // Medium priority keywords
  for (const keyword of MEDIUM_PRIORITY_KEYWORDS) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      score += 8;
      break;
    }
  }

  // Extract action
  for (const keyword of ACTION_KEYWORDS) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      action = capitalizeFirst(keyword);
      score += 10;
      break;
    }
  }

  // Extract tags
  for (const { pattern, tag } of TAG_PATTERNS) {
    if (pattern.test(textToAnalyze)) {
      tags.add(tag);
    }
  }

  // Extract deadline
  for (const pattern of DATE_PATTERNS) {
    const match = newContent.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime()) && parsed > new Date()) {
        deadline = parsed;
        score += 15; // Boost score for time-sensitive items
        tags.add("deadline");
        break;
      }
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  return {
    score,
    tags: Array.from(tags),
    action,
    deadline,
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
