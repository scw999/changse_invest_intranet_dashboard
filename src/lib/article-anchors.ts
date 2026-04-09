/**
 * Article anchor parser and section splitter.
 *
 * The convention: any markdown heading line can carry a stable anchor id by
 * appending `{#anchor-id}` at the end of the heading text.
 *
 *   ## 시장 해석 {#market-interpretation}
 *   ### 삼성전자 저평가 논점 {#samsung-valuation}
 *
 * The anchor id is the stable handle that image attachments target via
 * `placement: "inline", anchorKey: "samsung-valuation"`. Heading text may be
 * edited freely without breaking placement, as long as the `{#id}` part is
 * preserved.
 *
 * This module is intentionally dependency-free, deterministic, and runs in
 * a single line scan so it is safe to call on every render of the detail page
 * (the parser is also memoized at the call site).
 */

const ANCHOR_HEADING_REGEX =
  /^(#{1,6})\s+(.+?)\s*\{#([a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)\}\s*$/i;

/** Matches ANY markdown heading line — with or without an `{#id}` anchor. */
const PLAIN_HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

const ANCHOR_KEY_NORMALIZE_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

/**
 * The pseudo-anchor key used for the preamble — everything before the first
 * anchored heading. Inline images cannot target this key (they need a real
 * anchor), but the renderer uses it internally to flush the preamble segment
 * before any anchor section appears.
 */
export const PREAMBLE_ANCHOR_KEY = "__preamble__";

export type ArticleSection = {
  /** Stable anchor id for this section, or PREAMBLE_ANCHOR_KEY for the lead-in. */
  anchorKey: string;
  /** Heading display text without the `{#id}` suffix. Empty for the preamble. */
  heading: string;
  /** Heading level (1..6). 0 for the preamble. */
  level: number;
  /** Markdown content of this section, including its own (cleaned) heading line. */
  content: string;
};

export type ArticleAnchor = {
  anchorKey: string;
  heading: string;
  level: number;
};

/**
 * Lowercase + trim a candidate anchor key. Returns null if it cannot be
 * normalized into a stable id (e.g. empty, too long, illegal characters).
 *
 * Mirrors the server-side normalizer in `news-images.ts` so the client and
 * server agree on what counts as a valid anchor.
 */
export function normalizeAnchorKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^#/, "").toLowerCase();
  if (!trimmed || trimmed.length > 80) {
    return null;
  }

  if (!ANCHOR_KEY_NORMALIZE_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Strip a `{#anchor-id}` suffix from a single heading line. If the line does
 * not match an anchored heading, it is returned unchanged.
 *
 * Used so the rendered heading shows clean text instead of leaking the
 * `{#id}` syntax to readers.
 */
export function stripAnchorSuffix(line: string): string {
  const match = line.match(ANCHOR_HEADING_REGEX);
  if (!match) {
    return line;
  }
  const [, hashes, heading] = match;
  return `${hashes} ${heading.trim()}`;
}

/**
 * Walk a markdown body line by line and split it into anchor-bounded sections.
 *
 * Output guarantees:
 * - The first section is always the preamble (anchorKey = PREAMBLE_ANCHOR_KEY).
 *   Its content is whatever appears before the first anchored heading. It may
 *   itself contain plain (non-anchored) headings, which are preserved as-is.
 * - Each subsequent section starts at an anchored heading and ends right
 *   before the next anchored heading.
 * - Heading lines have their `{#id}` suffix stripped in the section content,
 *   so consumers can hand the content directly to a markdown renderer.
 * - Sections are returned in document order.
 * - Duplicate anchor ids are tolerated. The first occurrence "wins" for
 *   placement lookups; subsequent occurrences still appear as their own
 *   sections (so the body still renders), but inline images targeting that
 *   key will be inserted after the first match. This keeps placement
 *   deterministic.
 */
export function parseArticleSections(body: string | null | undefined): {
  sections: ArticleSection[];
  anchors: ArticleAnchor[];
} {
  const safeBody = typeof body === "string" ? body : "";
  const lines = safeBody.split(/\r?\n/);

  // ── Pass 1: try the strict {#id} anchor scan. ──────────────────────────
  const sections: ArticleSection[] = [];
  const anchors: ArticleAnchor[] = [];
  const seenAnchorKeys = new Set<string>();

  let current: ArticleSection = {
    anchorKey: PREAMBLE_ANCHOR_KEY,
    heading: "",
    level: 0,
    content: "",
  };

  const flushCurrent = () => {
    sections.push({
      ...current,
      content: current.content.replace(/\s+$/, ""),
    });
  };

  for (const line of lines) {
    const match = line.match(ANCHOR_HEADING_REGEX);
    if (match) {
      const [, hashes, headingText, rawAnchor] = match;
      const anchorKey = normalizeAnchorKey(rawAnchor);

      if (anchorKey) {
        // Close out the previous section.
        flushCurrent();

        const cleanedHeadingLine = `${hashes} ${headingText.trim()}`;
        current = {
          anchorKey,
          heading: headingText.trim(),
          level: hashes.length,
          content: `${cleanedHeadingLine}\n`,
        };

        if (!seenAnchorKeys.has(anchorKey)) {
          seenAnchorKeys.add(anchorKey);
          anchors.push({
            anchorKey,
            heading: headingText.trim(),
            level: hashes.length,
          });
        }
        continue;
      }
    }

    current.content += `${line}\n`;
  }

  flushCurrent();

  // If at least one explicit {#id} anchor was found, we're done — the body
  // was authored with the anchor convention and the strict sections are the
  // authoritative split.
  if (anchors.length > 0) {
    return { sections, anchors };
  }

  // ── Pass 2 (fallback): split on ALL markdown headings. ─────────────────
  // The body has no `{#id}` markers, but it may still have plain headings
  // like `### 삼성전자 저평가 논점`. We split on those so the renderer's
  // Tier-2 auto-match can distribute images to heading-delimited sections
  // by display order. Synthetic anchor keys are generated so the renderer
  // can track them — they are never persisted.

  const fallbackSections: ArticleSection[] = [];
  const fallbackAnchors: ArticleAnchor[] = [];
  let headingIdx = 0;

  let fbCurrent: ArticleSection = {
    anchorKey: PREAMBLE_ANCHOR_KEY,
    heading: "",
    level: 0,
    content: "",
  };

  const flushFbCurrent = () => {
    fallbackSections.push({
      ...fbCurrent,
      content: fbCurrent.content.replace(/\s+$/, ""),
    });
  };

  for (const line of lines) {
    const plainMatch = line.match(PLAIN_HEADING_REGEX);
    if (plainMatch) {
      const [, hashes, headingText] = plainMatch;
      const cleanHeading = headingText
        .replace(/\s*\{#[^}]*\}\s*$/, "")
        .trim();

      flushFbCurrent();

      const syntheticKey = `__heading-${headingIdx}__`;
      headingIdx += 1;

      fbCurrent = {
        anchorKey: syntheticKey,
        heading: cleanHeading,
        level: hashes.length,
        content: `${line}\n`,
      };

      fallbackAnchors.push({
        anchorKey: syntheticKey,
        heading: cleanHeading,
        level: hashes.length,
      });
      continue;
    }

    fbCurrent.content += `${line}\n`;
  }

  flushFbCurrent();

  // Only return the fallback split if we actually found headings — otherwise
  // keep the single-preamble result from pass 1 (backward compatible).
  if (fallbackAnchors.length > 0) {
    return { sections: fallbackSections, anchors: fallbackAnchors };
  }

  return { sections, anchors };
}

/**
 * Compact helper used by the admin UI to surface anchor suggestions for
 * inline-placement controls. Returns the same shape as `parseArticleSections`
 * but only the anchors list, so callers can `useMemo` cheaply.
 */
export function extractArticleAnchors(body: string | null | undefined): ArticleAnchor[] {
  return parseArticleSections(body).anchors;
}
