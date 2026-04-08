import "server-only";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureMutationSuccess } from "@/lib/server/private-admin";

export const NEWS_IMAGES_BUCKET = "news-images";
/**
 * Hard byte cap on the *incoming* upload (before any optimization).
 * Most Telegram screenshots are well under this. Anything larger is rejected
 * before being decoded so we never sit on giant buffers in memory.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Maximum dimension (width or height) of the optimized display image.
 * 1600 is large enough for full-screen retina viewing on most laptops while
 * keeping the on-the-wire size for a typical screenshot well under 300 KB.
 */
const MAX_DISPLAY_DIMENSION = 1600;

/**
 * WebP encoder quality for the display image. 82 is the standard sharp/Google
 * recommendation that preserves text and chart edges without visible artifacts.
 */
const DISPLAY_WEBP_QUALITY = 82;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Mime types we ask sharp to re-encode. Animated GIFs are intentionally
 * excluded so the animation is preserved when present.
 */
const OPTIMIZABLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export type NewsImagePlacement = "gallery" | "inline";

export type NewsImageRow = {
  id: string;
  owner_id: string;
  news_item_id: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  caption: string;
  alt: string;
  display_order: number;
  is_cover: boolean;
  placement: NewsImagePlacement;
  anchor_key: string | null;
};

export type NewsImageCreateInput = {
  filename?: string;
  contentType?: string;
  bufferBase64?: string;
  url?: string;
  caption?: string;
  alt?: string;
  order?: number;
  isCover?: boolean;
  placement?: NewsImagePlacement;
  anchorKey?: string;
};

export type NewsImageUpdateInput = {
  imageId: string;
  caption?: string;
  alt?: string;
  order?: number;
  isCover?: boolean;
  placement?: NewsImagePlacement;
  anchorKey?: string | null;
};

export type NewsImageOperations = {
  add?: NewsImageCreateInput[];
  update?: NewsImageUpdateInput[];
  reorder?: Array<{ imageId: string; order: number }>;
  delete?: string[];
  replaceAll?: boolean;
};

function decodeBase64Buffer(value: string) {
  const cleaned = value.includes(",") ? value.split(",").pop() ?? "" : value;
  const trimmed = cleaned.trim();
  if (!trimmed) {
    throw new Error("Image bufferBase64 is empty.");
  }

  try {
    return Buffer.from(trimmed, "base64");
  } catch {
    throw new Error("Image bufferBase64 is not valid base64.");
  }
}

function inferMimeFromFilename(filename: string | undefined) {
  if (!filename) {
    return undefined;
  }

  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

type OptimizedImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  optimized: boolean;
};

/**
 * Decode the incoming image with sharp and re-encode it as a single optimized
 * WebP "display" image. The original buffer is intentionally NOT kept — the
 * detail page only ever needs the optimized version, and dropping the original
 * cuts storage usage by an order of magnitude on typical screenshots.
 *
 * Behavior summary:
 * - JPEG / PNG / WebP / AVIF → resize to fit within 1600x1600, encode as WebP @ q82
 * - GIF (potentially animated) → stored as-is to preserve animation
 * - Anything sharp cannot decode → stored as-is, with a warning
 * - EXIF orientation is honored (auto-rotate) and EXIF metadata is stripped
 *   on re-encode for privacy.
 */
async function optimizeImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<OptimizedImage> {
  if (!OPTIMIZABLE_MIME_TYPES.has(mimeType)) {
    return {
      buffer,
      mimeType,
      extension: EXTENSION_BY_MIME[mimeType] ?? "bin",
      optimized: false,
    };
  }

  try {
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await pipeline.metadata();

    // Animated WebP / animated AVIF: do not flatten or sharp will drop frames.
    if (metadata.pages && metadata.pages > 1) {
      return {
        buffer,
        mimeType,
        extension: EXTENSION_BY_MIME[mimeType] ?? "bin",
        width: metadata.width,
        height: metadata.height,
        optimized: false,
      };
    }

    const result = await pipeline
      .resize(MAX_DISPLAY_DIMENSION, MAX_DISPLAY_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: DISPLAY_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      mimeType: "image/webp",
      extension: "webp",
      width: result.info.width,
      height: result.info.height,
      optimized: true,
    };
  } catch (error) {
    console.warn(
      `news-images: optimization failed for ${mimeType}, falling back to original. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {
      buffer,
      mimeType,
      extension: EXTENSION_BY_MIME[mimeType] ?? "bin",
      optimized: false,
    };
  }
}

async function recordCleanupQueueEntries(
  client: SupabaseClient,
  ownerId: string,
  storagePaths: string[],
  failureReason: string,
) {
  if (storagePaths.length === 0) {
    return;
  }

  const rows = storagePaths.map((path) => ({
    owner_id: ownerId,
    storage_path: path,
    failure_reason: failureReason.slice(0, 500),
    last_attempt_at: new Date().toISOString(),
    attempts: 1,
  }));

  const { error } = await client.from("news_image_cleanup_queue").insert(rows);
  if (error) {
    // Last-resort: even the queue insert failed. Surface to logs only — we do
    // not want to fail the parent delete because the user already asked for it.
    console.warn(
      `news-images: failed to enqueue cleanup for ${storagePaths.length} path(s): ${error.message}`,
    );
  }
}

function buildStorageObjectKey(ownerId: string, newsItemId: string, extension: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${ownerId}/${newsItemId}/${random}.${extension}`;
}

async function uploadBinaryToStorage(
  client: SupabaseClient,
  storagePath: string,
  buffer: Buffer,
  contentType: string,
) {
  const { error } = await client.storage
    .from(NEWS_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: "31536000, immutable",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image to storage: ${error.message}`);
  }
}

function getPublicUrl(client: SupabaseClient, storagePath: string) {
  const { data } = client.storage.from(NEWS_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Try to remove storage objects right after a row delete. If the storage call
 * fails, we record the orphaned paths in `news_image_cleanup_queue` so a
 * periodic sweep (or a future maintenance route) can drain them. The parent
 * row delete is NOT rolled back — the user already asked for the deletion and
 * we don't want a transient storage outage to block the dashboard.
 */
async function deleteStorageObjectsSafely(
  client: SupabaseClient,
  ownerId: string,
  storagePaths: string[],
) {
  if (storagePaths.length === 0) {
    return;
  }

  try {
    const { error } = await client.storage.from(NEWS_IMAGES_BUCKET).remove(storagePaths);
    if (error) {
      console.warn(`news-images cleanup warning: ${error.message}`);
      await recordCleanupQueueEntries(client, ownerId, storagePaths, error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`news-images cleanup warning: ${message}`);
    await recordCleanupQueueEntries(client, ownerId, storagePaths, message);
  }
}

const IMAGE_ROW_COLUMNS =
  "id, owner_id, news_item_id, storage_path, public_url, mime_type, file_size, width, height, caption, alt, display_order, is_cover, placement, anchor_key";

export async function fetchImagesForNewsItem(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
): Promise<NewsImageRow[]> {
  const { data, error } = await client
    .from("news_item_images")
    .select(IMAGE_ROW_COLUMNS)
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .order("display_order", { ascending: true });

  ensureMutationSuccess(error, "Failed to load news item images.");
  return (data ?? []) as NewsImageRow[];
}

const ANCHOR_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
const ANCHOR_KEY_MAX_LENGTH = 80;

export function normalizeAnchorKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > ANCHOR_KEY_MAX_LENGTH) {
    return null;
  }

  if (!ANCHOR_KEY_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function resolvePlacement(
  rawPlacement: NewsImagePlacement | undefined,
  rawAnchorKey: string | undefined,
): { placement: NewsImagePlacement; anchorKey: string | null } {
  const normalizedAnchor = rawAnchorKey ? normalizeAnchorKey(rawAnchorKey) : null;

  // Inline requires a valid anchor key. If anchor is invalid, fall back to
  // gallery so the image is never silently dropped.
  if (rawPlacement === "inline") {
    if (!normalizedAnchor) {
      return { placement: "gallery", anchorKey: null };
    }
    return { placement: "inline", anchorKey: normalizedAnchor };
  }

  return { placement: "gallery", anchorKey: null };
}

async function persistImageRecord(
  client: SupabaseClient,
  row: {
    owner_id: string;
    news_item_id: string;
    storage_path: string;
    public_url: string;
    mime_type: string;
    file_size: number | null;
    width: number | null;
    height: number | null;
    caption: string;
    alt: string;
    display_order: number;
    is_cover: boolean;
    placement: NewsImagePlacement;
    anchor_key: string | null;
  },
) {
  const { error } = await client.from("news_item_images").insert(row);
  ensureMutationSuccess(error, "Failed to save image record.");
}

async function createImageFromInput(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  input: NewsImageCreateInput,
  fallbackOrder: number,
) {
  const inferredMime =
    input.contentType?.toLowerCase() || inferMimeFromFilename(input.filename) || "image/jpeg";

  if (!ALLOWED_MIME_TYPES.has(inferredMime)) {
    throw new Error(`Unsupported image mime type: ${inferredMime}`);
  }

  let storagePath: string;
  let publicUrl: string;
  let storedMime = inferredMime;
  let fileSize: number | null = null;
  let storedWidth: number | null = null;
  let storedHeight: number | null = null;

  if (input.bufferBase64) {
    const rawBuffer = decodeBase64Buffer(input.bufferBase64);
    if (rawBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(
        `Image exceeds the ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB size limit.`,
      );
    }

    const optimized = await optimizeImageBuffer(rawBuffer, inferredMime);

    storagePath = buildStorageObjectKey(ownerId, newsItemId, optimized.extension);
    await uploadBinaryToStorage(client, storagePath, optimized.buffer, optimized.mimeType);
    publicUrl = getPublicUrl(client, storagePath);
    storedMime = optimized.mimeType;
    fileSize = optimized.buffer.byteLength;
    storedWidth = optimized.width ?? null;
    storedHeight = optimized.height ?? null;
  } else if (input.url) {
    // Allow assistant flows to attach an already-hosted image without re-uploading.
    storagePath = `external/${input.url}`;
    publicUrl = input.url;
  } else {
    throw new Error("Image input requires bufferBase64 or url.");
  }

  const { placement, anchorKey } = resolvePlacement(input.placement, input.anchorKey);

  await persistImageRecord(client, {
    owner_id: ownerId,
    news_item_id: newsItemId,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: storedMime,
    file_size: fileSize,
    width: storedWidth,
    height: storedHeight,
    caption: (input.caption ?? "").trim(),
    alt: (input.alt ?? "").trim(),
    display_order:
      typeof input.order === "number" && Number.isFinite(input.order) ? input.order : fallbackOrder,
    is_cover: Boolean(input.isCover),
    placement,
    anchor_key: anchorKey,
  });
}

async function deleteImagesByIds(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  imageIds: string[],
) {
  if (imageIds.length === 0) {
    return;
  }

  const { data: existing, error: selectError } = await client
    .from("news_item_images")
    .select("id, storage_path")
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .in("id", imageIds);
  ensureMutationSuccess(selectError, "Failed to load images for deletion.");

  const rows = (existing ?? []) as Array<{ id: string; storage_path: string }>;
  if (rows.length === 0) {
    return;
  }

  const { error: deleteError } = await client
    .from("news_item_images")
    .delete()
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .in(
      "id",
      rows.map((row) => row.id),
    );
  ensureMutationSuccess(deleteError, "Failed to delete image records.");

  const cleanupPaths = rows
    .map((row) => row.storage_path)
    .filter((path) => path && !path.startsWith("external/"));
  await deleteStorageObjectsSafely(client, ownerId, cleanupPaths);
}

async function ensureSingleCover(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  excludeImageId: string,
) {
  const { error } = await client
    .from("news_item_images")
    .update({ is_cover: false })
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .neq("id", excludeImageId);
  ensureMutationSuccess(error, "Failed to reset other cover flags.");
}

async function applyImageUpdates(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  updates: NewsImageUpdateInput[],
) {
  for (const update of updates) {
    if (!update.imageId) {
      continue;
    }

    const patch: Record<string, unknown> = {};
    if (typeof update.caption === "string") patch.caption = update.caption.trim();
    if (typeof update.alt === "string") patch.alt = update.alt.trim();
    if (typeof update.order === "number" && Number.isFinite(update.order)) {
      patch.display_order = update.order;
    }
    if (typeof update.isCover === "boolean") {
      patch.is_cover = update.isCover;
    }

    // Placement and anchor are coupled. If either is touched, we always
    // re-resolve the pair so the row can never end up "inline with no anchor".
    const placementTouched =
      update.placement !== undefined || update.anchorKey !== undefined;

    if (placementTouched) {
      // Read existing values so a partial patch (e.g. only changing caption +
      // anchor) preserves the other side of the pair.
      const { data: currentRow, error: fetchError } = await client
        .from("news_item_images")
        .select("placement, anchor_key")
        .eq("owner_id", ownerId)
        .eq("news_item_id", newsItemId)
        .eq("id", update.imageId)
        .maybeSingle();
      ensureMutationSuccess(fetchError, "Failed to load image for update.");

      const currentPlacement = (currentRow?.placement === "inline" ? "inline" : "gallery") as
        | "inline"
        | "gallery";
      const currentAnchorKey =
        typeof currentRow?.anchor_key === "string" ? currentRow.anchor_key : undefined;

      const nextPlacement: NewsImagePlacement =
        update.placement !== undefined ? update.placement : currentPlacement;

      let nextAnchorKey: string | undefined;
      if (update.anchorKey === null) {
        nextAnchorKey = undefined;
      } else if (typeof update.anchorKey === "string") {
        nextAnchorKey = update.anchorKey;
      } else {
        nextAnchorKey = currentAnchorKey;
      }

      const resolved = resolvePlacement(nextPlacement, nextAnchorKey);
      patch.placement = resolved.placement;
      patch.anchor_key = resolved.anchorKey;
    }

    if (Object.keys(patch).length === 0) {
      continue;
    }

    const { error } = await client
      .from("news_item_images")
      .update(patch)
      .eq("owner_id", ownerId)
      .eq("news_item_id", newsItemId)
      .eq("id", update.imageId);
    ensureMutationSuccess(error, "Failed to update image metadata.");

    if (update.isCover === true) {
      await ensureSingleCover(client, ownerId, newsItemId, update.imageId);
    }
  }
}

async function applyReorder(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  reorder: Array<{ imageId: string; order: number }>,
) {
  for (const entry of reorder) {
    if (!entry.imageId || typeof entry.order !== "number") {
      continue;
    }

    const { error } = await client
      .from("news_item_images")
      .update({ display_order: entry.order })
      .eq("owner_id", ownerId)
      .eq("news_item_id", newsItemId)
      .eq("id", entry.imageId);
    ensureMutationSuccess(error, "Failed to reorder image.");
  }
}

/**
 * Apply structured image operations against a news item.
 *
 * `replaceAll` semantics: when true, all current attachments are removed first.
 * Otherwise add/update/reorder/delete are applied incrementally.
 */
export async function applyNewsImageOperations(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  operations: NewsImageOperations,
) {
  if (operations.replaceAll) {
    const existing = await fetchImagesForNewsItem(client, ownerId, newsItemId);
    if (existing.length > 0) {
      await deleteImagesByIds(
        client,
        ownerId,
        newsItemId,
        existing.map((row) => row.id),
      );
    }
  } else if (operations.delete && operations.delete.length > 0) {
    await deleteImagesByIds(client, ownerId, newsItemId, operations.delete);
  }

  if (operations.update && operations.update.length > 0) {
    await applyImageUpdates(client, ownerId, newsItemId, operations.update);
  }

  if (operations.reorder && operations.reorder.length > 0) {
    await applyReorder(client, ownerId, newsItemId, operations.reorder);
  }

  if (operations.add && operations.add.length > 0) {
    const currentRows = await fetchImagesForNewsItem(client, ownerId, newsItemId);
    let nextOrder = currentRows.reduce((max, row) => Math.max(max, row.display_order), 0) + 1;

    for (const input of operations.add) {
      await createImageFromInput(client, ownerId, newsItemId, input, nextOrder);
      nextOrder += 1;
    }

    // Cover normalization: if the assistant set isCover on a freshly inserted row,
    // turn off the flag on every other row for this news item.
    const refreshed = await fetchImagesForNewsItem(client, ownerId, newsItemId);
    const newCover = refreshed.find((row) => row.is_cover);
    if (newCover) {
      await ensureSingleCover(client, ownerId, newsItemId, newCover.id);
    }
  }
}

/** Convenience helper used by create-news flows. */
export async function attachInitialNewsImages(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  inputs: NewsImageCreateInput[],
) {
  if (!inputs || inputs.length === 0) {
    return;
  }

  await applyNewsImageOperations(client, ownerId, newsItemId, { add: inputs });
}

export function deriveCoverUrl(rows: NewsImageRow[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  const cover = rows.find((row) => row.is_cover);
  return (cover ?? rows[0]).public_url;
}
