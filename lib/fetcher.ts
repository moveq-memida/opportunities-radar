import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createHash } from "crypto";
import { Source } from "./db/schema";

export interface FetchResult {
  content: string;
  contentHash: string;
  title?: string;
}

/**
 * Fetches and extracts content from a source URL
 */
export async function fetchSource(source: Source): Promise<FetchResult> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OpportunitiesRadar/1.0; +https://github.com/opportunities-radar)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
  }

  const html = await response.text();
  const content = extractContent(html, source.extractor);
  const contentHash = hashContent(content);

  return {
    content,
    contentHash,
  };
}

/**
 * Extracts main content from HTML using Readability or custom extractors
 */
function extractContent(html: string, extractor?: string | null): string {
  const dom = new JSDOM(html, { url: "https://example.com" });
  const document = dom.window.document;

  // Try custom extractors first
  if (extractor) {
    const customContent = extractWithCustom(document, extractor);
    if (customContent) {
      return customContent;
    }
  }

  // Fall back to Readability
  const reader = new Readability(document);
  const article = reader.parse();

  if (article?.textContent) {
    return article.textContent.trim();
  }

  // Last resort: extract body text
  const body = document.body;
  if (body) {
    // Remove scripts and styles
    body.querySelectorAll("script, style, nav, footer, header").forEach((el) => el.remove());
    return body.textContent?.trim() || "";
  }

  return "";
}

/**
 * Custom extractors for specific sites
 */
function extractWithCustom(document: Document, extractor: string): string | null {
  switch (extractor) {
    case "paragraph": {
      // Paragraph.xyz blog posts
      const articles = document.querySelectorAll("article");
      if (articles.length > 0) {
        return Array.from(articles)
          .map((a) => a.textContent?.trim())
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
      break;
    }

    case "charmverse": {
      // CharmVerse grant pages
      const mainContent = document.querySelector('[data-testid="page-content"]');
      if (mainContent) {
        return mainContent.textContent?.trim() || null;
      }
      break;
    }

    case "base-blog": {
      // Base.org blog
      const posts = document.querySelectorAll('[class*="post"], [class*="article"]');
      if (posts.length > 0) {
        return Array.from(posts)
          .map((p) => p.textContent?.trim())
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
      break;
    }

    case "farcaster-blog": {
      // Farcaster blog
      const main = document.querySelector("main");
      if (main) {
        return main.textContent?.trim() || null;
      }
      break;
    }

    case "notion": {
      // Notion pages
      const blocks = document.querySelectorAll('[class*="notion-block"]');
      if (blocks.length > 0) {
        return Array.from(blocks)
          .map((b) => b.textContent?.trim())
          .filter(Boolean)
          .join("\n");
      }
      break;
    }

    case "snapshot": {
      // Snapshot proposals
      const proposals = document.querySelectorAll('[class*="proposal"]');
      if (proposals.length > 0) {
        return Array.from(proposals)
          .map((p) => p.textContent?.trim())
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
      break;
    }

    case "discourse": {
      // Discourse forums
      const topics = document.querySelectorAll(".topic-list-item, .topic-body");
      if (topics.length > 0) {
        return Array.from(topics)
          .map((t) => t.textContent?.trim())
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
      break;
    }

    case "purple": {
      // Purple DAO
      const content = document.querySelector('[class*="content"], main');
      if (content) {
        return content.textContent?.trim() || null;
      }
      break;
    }
  }

  return null;
}

/**
 * Creates a hash of content for comparison
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
