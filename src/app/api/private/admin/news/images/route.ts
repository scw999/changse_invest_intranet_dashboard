import { NextResponse } from "next/server";

import { requireAdminRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import {
  applyImageOperations,
  buildContentMeta,
  processNewImages,
} from "@/lib/server/image-storage";
import {
  ensureMutationSuccess,
  resolveResearchOwnerId,
} from "@/lib/server/private-admin";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ImageAttachment } from "@/types/research";

export const dynamic = "force-dynamic";

type UploadBody = {
  newsItemId: string;
  images?: Array<{
    filename: string;
    contentType: string;
    caption?: string;
    alt?: string;
    order?: number;
    placement?: "gallery" | "inline";
    anchorKey?: string;
    bufferBase64: string;
  }>;
  imageOperations?: Array<
    | {
        action: "add";
        filename: string;
        contentType: string;
        caption?: string;
        alt?: string;
        order?: number;
        placement?: "gallery" | "inline";
        anchorKey?: string;
        bufferBase64: string;
      }
    | {
        action: "update";
        imageId: string;
        caption?: string;
        alt?: string;
        order?: number;
        placement?: "gallery" | "inline";
        anchorKey?: string;
      }
    | {
        action: "delete";
        imageId: string;
      }
  >;
};

export async function POST(request: Request) {
  const authResponse = await requireAdminRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as UploadBody | null;

  if (!viewer || !body?.newsItemId) {
    return NextResponse.json({ error: "newsItemId is required." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    const { data: existing, error: fetchError } = await client
      .from("news_items")
      .select("content_meta")
      .eq("owner_id", ownerId)
      .eq("id", body.newsItemId)
      .single();
    ensureMutationSuccess(fetchError, "Failed to load news item.");

    const meta = (existing?.content_meta ?? {}) as {
      monitoring?: Record<string, unknown>;
      images?: ImageAttachment[];
    };
    let images: ImageAttachment[] = meta.images ?? [];

    if (body.images && body.images.length > 0) {
      const newImages = await processNewImages(
        client,
        ownerId,
        body.newsItemId,
        body.images.map((img) => ({
          ...img,
          order: img.order ?? 0,
          placement: img.placement ?? "gallery",
        })),
      );
      images = [...images, ...newImages];
    }

    if (body.imageOperations && body.imageOperations.length > 0) {
      images = await applyImageOperations(
        client,
        ownerId,
        body.newsItemId,
        images,
        body.imageOperations.map((op) => {
          if (op.action === "add") {
            return { ...op, order: op.order ?? 0, placement: op.placement ?? "gallery" };
          }
          return op;
        }),
      );
    }

    const { error: updateError } = await client
      .from("news_items")
      .update({
        content_meta: buildContentMeta(meta.monitoring, images),
      })
      .eq("owner_id", ownerId)
      .eq("id", body.newsItemId);
    ensureMutationSuccess(updateError, "Failed to update image metadata.");

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json(dataset);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process images.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
