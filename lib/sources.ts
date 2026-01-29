import { NewSource } from "./db/schema";

export type SourceCategory = "grants" | "protocol" | "governance" | "ecosystem";
export type SourceType = "html" | "rss" | "api";

export interface SourceDefinition extends Omit<NewSource, "id" | "createdAt" | "updatedAt" | "lastFetchedAt"> {
  enabled: boolean;
}

// Default sources to monitor
export const defaultSources: SourceDefinition[] = [
  {
    name: "Base Grants",
    type: "html",
    url: "https://paragraph.xyz/@grants.base.eth",
    category: "grants",
    extractor: "paragraph",
    enabled: true,
  },
  {
    name: "Optimism Grants",
    type: "html",
    url: "https://app.charmverse.io/op-grants",
    category: "grants",
    extractor: "charmverse",
    enabled: true,
  },
  {
    name: "Base Blog",
    type: "html",
    url: "https://base.org/blog",
    category: "protocol",
    extractor: "base-blog",
    enabled: true,
  },
  {
    name: "Farcaster Blog",
    type: "html",
    url: "https://www.farcaster.xyz/blog",
    category: "ecosystem",
    extractor: "farcaster-blog",
    enabled: true,
  },
  {
    name: "Warpcast Updates",
    type: "html",
    url: "https://warpcast.notion.site/Warpcast-Release-Notes-a2ae1e01e5a84bd39da4a3bf5bc53982",
    category: "ecosystem",
    extractor: "notion",
    enabled: true,
  },
  {
    name: "Base Governance",
    type: "html",
    url: "https://snapshot.org/#/basegovernance.eth",
    category: "governance",
    extractor: "snapshot",
    enabled: true,
  },
  {
    name: "Optimism Forum",
    type: "html",
    url: "https://gov.optimism.io/c/proposals/38",
    category: "governance",
    extractor: "discourse",
    enabled: true,
  },
  {
    name: "Purple DAO",
    type: "html",
    url: "https://purple.construction",
    category: "grants",
    extractor: "purple",
    enabled: true,
  },
];

// Category labels for display
export const categoryLabels: Record<SourceCategory, string> = {
  grants: "Grants",
  protocol: "Protocol",
  governance: "Governance",
  ecosystem: "Ecosystem",
};

// Category colors for badges
export const categoryVariants: Record<SourceCategory, "brand" | "success" | "warning" | "error"> = {
  grants: "success",
  protocol: "brand",
  governance: "warning",
  ecosystem: "brand",
};
