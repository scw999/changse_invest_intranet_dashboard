import { createHash } from "node:crypto";

const THEME_SLUG_FALLBACK_PREFIX = "theme";
const THEME_SLUG_HASH_LENGTH = 12;

function normalizeSlugSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function hashThemeSlugSource(value: string) {
  return createHash("sha256")
    .update(value.trim(), "utf8")
    .digest("hex")
    .slice(0, THEME_SLUG_HASH_LENGTH);
}

export function buildThemeSlugFromName(name: string) {
  const normalized = normalizeSlugSegment(name);
  if (normalized) {
    return normalized;
  }

  return `${THEME_SLUG_FALLBACK_PREFIX}-${hashThemeSlugSource(name)}`;
}

export function normalizeExplicitThemeSlug(slug: string) {
  const normalized = normalizeSlugSegment(slug);
  if (!normalized) {
    throw new Error(
      "Theme slug must contain at least one ASCII letter or number after normalization.",
    );
  }

  return normalized;
}

export function isSafeThemeSlug(slug: string | null | undefined) {
  return Boolean(slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
}

export function getThemeSlugCandidate(input: { name: string; slug?: string | null }) {
  if (input.slug && input.slug.trim()) {
    return normalizeExplicitThemeSlug(input.slug);
  }

  return buildThemeSlugFromName(input.name);
}

export function buildThemeSlugConflictSuffix(input: { name: string; ownerId: string }) {
  return createHash("sha256")
    .update(`${input.ownerId}:${input.name.trim()}`, "utf8")
    .digest("hex")
    .slice(0, 8);
}
