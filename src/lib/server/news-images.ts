import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureMutationSuccess } from "@/lib/server/private-admin";

export const NEWS_IMAGES_BUCKET = "news-images";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
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
};

export type NewsImageUpdateInput = {
  imageId: string;
  caption?: string;
  alt?: string;
  order?: number;
  isCover?: boolean;
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

function buildStorageObjectKey(ownerId: string, newsItemId: string, mimeType: string) {
  const ext = EXTENSION_BY_MIME[mimeType] ?? "bin";
  const random =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${ownerId}/${newsItemId}/${random}.${ext}`;
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

async function deleteStorageObjectsSafely(client: SupabaseClient, storagePaths: string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await client.storage.from(NEWS_IMAGES_BUCKET).remove(storagePaths);
  if (error) {
    // Storage cleanup is best-effort. Row deletion already succeeded.
    console.warn(`news-images cleanup warning: ${error.message}`);
  }
}

export async function fetchImagesForNewsItem(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
): Promise<NewsImageRow[]> {
  const { data, error } = await client
    .from("news_item_images")
    .select(
      "id, owner_id, news_item_id, storage_path, public_url, mime_type, file_size, width, height, caption, alt, display_order, is_cover",
    )
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .order("display_order", { ascending: true });

  ensureMutationSuccess(error, "Failed to load news item images.");
  return (data ?? []) as NewsImageRow[];
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
    caption: string;
    alt: string;
    display_order: number;
    is_cover: boolean;
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
  let fileSize: number | null = null;

  if (input.bufferBase64) {
    const buffer = decodeBase64Buffer(input.bufferBase64);
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(
        `Image exceeds the ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB size limit.`,
      );
    }

    storagePath = buildStorageObjectKey(ownerId, newsItemId, inferredMime);
    await uploadBinaryToStorage(client, storagePath, buffer, inferredMime);
    publicUrl = getPublicUrl(client, storagePath);
    fileSize = buffer.byteLength;
  } else if (input.url) {
    // Allow assistant flows to attach an already-hosted image without re-uploading.
    storagePath = `external/${input.url}`;
    publicUrl = input.url;
  } else {
    throw new Error("Image input requires bufferBase64 or url.");
  }

  await persistImageRecord(client, {
    owner_id: ownerId,
    news_item_id: newsItemId,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: inferredMime,
    file_size: fileSize,
    caption: (input.caption ?? "").trim(),
    alt: (input.alt ?? "").trim(),
    display_order:
      typeof input.order === "number" && Number.isFinite(input.order) ? input.order : fallbackOrder,
    is_cover: Boolean(input.isCover),
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
  await deleteStorageObjectsSafely(client, cleanupPaths);
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
