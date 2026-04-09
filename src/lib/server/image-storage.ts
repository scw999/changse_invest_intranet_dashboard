import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ImageAttachment, ImagePlacement } from "@/types/research";
import type { ImageIngestInput, ImageOperationInput } from "@/lib/server/assistant-ingest";

const BUCKET = "news-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function createImageId() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `img-${uuid}`;
}

function buildStoragePath(ownerId: string, newsItemId: string, imageId: string, filename: string) {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${ownerId}/${newsItemId}/${imageId}${ext}`;
}

async function uploadBase64ToStorage(
  client: SupabaseClient,
  storagePath: string,
  base64Data: string,
  contentType: string,
) {
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`);
  }

  const { error } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

async function deleteFromStorage(client: SupabaseClient, storagePath: string) {
  const { error } = await client.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.error(`Failed to delete image from storage: ${error.message}`);
  }
}

export async function processNewImages(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  inputs: ImageIngestInput[],
): Promise<ImageAttachment[]> {
  const results: ImageAttachment[] = [];

  for (const input of inputs) {
    const imageId = createImageId();
    const storagePath = buildStoragePath(ownerId, newsItemId, imageId, input.filename);
    const url = await uploadBase64ToStorage(client, storagePath, input.bufferBase64, input.contentType);

    results.push({
      id: imageId,
      storagePath,
      url,
      filename: input.filename,
      contentType: input.contentType,
      caption: input.caption,
      alt: input.alt,
      order: input.order ?? 0,
      placement: input.placement ?? "gallery",
      anchorKey: input.anchorKey,
    });
  }

  return results;
}

export async function applyImageOperations(
  client: SupabaseClient,
  ownerId: string,
  newsItemId: string,
  existingImages: ImageAttachment[],
  operations: ImageOperationInput[],
): Promise<ImageAttachment[]> {
  let images = [...existingImages];

  for (const op of operations) {
    if (op.action === "add") {
      const imageId = createImageId();
      const storagePath = buildStoragePath(ownerId, newsItemId, imageId, op.filename);
      const url = await uploadBase64ToStorage(client, storagePath, op.bufferBase64, op.contentType);

      images.push({
        id: imageId,
        storagePath,
        url,
        filename: op.filename,
        contentType: op.contentType,
        caption: op.caption,
        alt: op.alt,
        order: op.order ?? 0,
        placement: op.placement ?? "gallery",
        anchorKey: op.anchorKey,
      });
    } else if (op.action === "update") {
      images = images.map((img) => {
        if (img.id !== op.imageId) return img;
        return {
          ...img,
          ...(op.caption !== undefined && { caption: op.caption }),
          ...(op.alt !== undefined && { alt: op.alt }),
          ...(op.order !== undefined && { order: op.order }),
          ...(op.placement !== undefined && { placement: op.placement as ImagePlacement }),
          ...(op.anchorKey !== undefined && { anchorKey: op.anchorKey }),
        };
      });
    } else if (op.action === "delete") {
      const target = images.find((img) => img.id === op.imageId);
      if (target) {
        await deleteFromStorage(client, target.storagePath);
        images = images.filter((img) => img.id !== op.imageId);
      }
    }
  }

  return images;
}

export function buildContentMeta(
  monitoring: NewsMeta["monitoring"],
  images?: ImageAttachment[],
) {
  const meta: Record<string, unknown> = {};
  if (monitoring) {
    meta.monitoring = monitoring;
  }
  if (images && images.length > 0) {
    meta.images = images;
  }
  return meta;
}

type NewsMeta = {
  monitoring?: {
    targetTickers?: string[];
    note?: string;
    referencePrice?: string;
    currentSnapshot?: string;
    triggerCondition?: string;
    nextCheckNote?: string;
  };
};
