import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

export interface DiffResult {
  patch: string;
  additions: string[];
  deletions: string[];
  hasChanges: boolean;
}

/**
 * Generates a diff between old and new content
 */
export function generateDiff(oldContent: string, newContent: string): DiffResult {
  // Create patch
  const patches = dmp.patch_make(oldContent, newContent);
  const patchText = dmp.patch_toText(patches);

  // Get detailed diffs for analysis
  const diffs = dmp.diff_main(oldContent, newContent);
  dmp.diff_cleanupSemantic(diffs);

  const additions: string[] = [];
  const deletions: string[] = [];

  for (const [operation, text] of diffs) {
    // Ignore whitespace-only changes
    if (!text.trim()) continue;

    if (operation === DiffMatchPatch.DIFF_INSERT) {
      additions.push(text.trim());
    } else if (operation === DiffMatchPatch.DIFF_DELETE) {
      deletions.push(text.trim());
    }
  }

  return {
    patch: patchText,
    additions,
    deletions,
    hasChanges: additions.length > 0 || deletions.length > 0,
  };
}

/**
 * Applies a patch to content
 */
export function applyPatch(content: string, patchText: string): string {
  const patches = dmp.patch_fromText(patchText);
  const [result] = dmp.patch_apply(patches, content);
  return result;
}

/**
 * Extracts meaningful changes from diff result
 */
export function extractChangeSummary(diff: DiffResult): {
  addedSections: string[];
  removedSections: string[];
} {
  // Group additions into logical sections
  const addedSections = groupIntoSections(diff.additions);
  const removedSections = groupIntoSections(diff.deletions);

  return { addedSections, removedSections };
}

/**
 * Groups text fragments into logical sections
 */
function groupIntoSections(fragments: string[]): string[] {
  if (fragments.length === 0) return [];

  const sections: string[] = [];
  let currentSection = "";

  for (const fragment of fragments) {
    // Skip very short fragments (likely formatting)
    if (fragment.length < 10) continue;

    // Check if this is a new section (starts with heading-like patterns)
    const isNewSection =
      /^(#|[A-Z][^.]*:|\d+\.|[-•*])/.test(fragment) ||
      fragment.length > 200;

    if (isNewSection && currentSection) {
      sections.push(currentSection.trim());
      currentSection = fragment;
    } else {
      currentSection += " " + fragment;
    }
  }

  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }

  return sections;
}
