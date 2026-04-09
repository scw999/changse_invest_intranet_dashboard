import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import {
  formatZodError,
  internalNewsIngestSchema,
} from "@/lib/server/assistant-ingest";
import {
  applyNewsImageOperations,
  attachInitialNewsImages,
} from "@/lib/server/news-images";
import { buildContentMeta } from "@/lib/server/image-storage";
import {
  buildFollowUpCopy,
  ensureMutationSuccess,
  resolveEntityId,
  resolveResearchOwnerId,
  resolveThemeIds,
  resolveTickerIds,
  type NewsMutationInput,
  type NewsPatchInput,
} from "@/lib/server/private-admin";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ImageAttachment } from "@/types/research";

export const dynamic = "force-dynamic";

function toFullNewsRow(payload: NewsMutationInput) {
  return {
    content_type: payload.contentType ?? "news",
    title: payload.title.trim(),
    summary: payload.summary.trim(),
    source_name: payload.sourceName.trim(),
    source_url: payload.sourceUrl.trim(),
    published_at: payload.publishedAt,
    scan_slot: payload.scanSlot,
    region: payload.region,
    affected_asset_classes: payload.affectedAssetClasses,
    market_interpretation: payload.marketInterpretation.trim(),
    directional_view: payload.directionalView,
    action_idea: payload.actionIdea.trim(),
    follow_up_status: payload.followUpStatus,
    follow_up_note: payload.followUpNote.trim(),
    importance: payload.importance,
    content_meta: buildContentMeta(payload.monitoring, payload.images),
  };
}

function toNewsPatchRow(payload: NewsPatchInput) {
  const row: Record<string, unknown> = {};

  if (payload.contentType !== undefined) row.content_type = payload.contentType;
  if (typeof payload.title === "string") row.title = payload.title.trim();
  if (typeof payload.summary === "string") row.summary = payload.summary.trim();
  if (typeof payload.sourceName === "string") row.source_name = payload.sourceName.trim();
  if (typeof payload.sourceUrl === "string") row.source_url = payload.sourceUrl.trim();
  if (typeof payload.publishedAt === "string") row.published_at = payload.publishedAt;
  if (payload.scanSlot !== undefined) row.scan_slot = payload.scanSlot;
  if (payload.region !== undefined) row.region = payload.region;
  if (Array.isArray(payload.affectedAssetClasses)) {
    row.affected_asset_classes = payload.affectedAssetClasses;
  }
  if (typeof payload.marketInterpretation === "string") {
    row.market_interpretation = payload.marketInterpretation.trim();
  }
  if (payload.directionalView !== undefined) row.directional_view = payload.directionalView;
  if (typeof payload.actionIdea === "string") row.action_idea = payload.actionIdea.trim();
  if (payload.followUpStatus !== undefined) row.follow_up_status = payload.followUpStatus;
  if (typeof payload.followUpNote === "string") row.follow_up_note = payload.followUpNote.trim();
  if (payload.importance !== undefined) row.importance = payload.importance;
  if (payload.monitoring !== undefined) {
    row.content_meta = payload.monitoring ? { monitoring: payload.monitoring } : {};
  }

  return row;
}

async function syncNewsRelations(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  ownerId: string,
  newsItemId: string,
  themeIds: string[] | undefined,
  tickerIds: string[] | undefined,
) {
  if (themeIds !== undefined) {
    const { error: deleteThemeError } = await client
      .from("news_item_themes")
      .delete()
      .eq("owner_id", ownerId)
      .eq("news_item_id", newsItemId);
    ensureMutationSuccess(deleteThemeError, "Failed to reset news theme links.");

    if (themeIds.length > 0) {
      const { error } = await client.from("news_item_themes").insert(
        themeIds.map((themeId) => ({
          owner_id: ownerId,
          news_item_id: newsItemId,
          theme_id: themeId,
        })),
      );
      ensureMutationSuccess(error, "Failed to save news themes.");
    }
  }

  if (tickerIds !== undefined) {
    const { error: deleteTickerError } = await client
      .from("news_item_tickers")
      .delete()
      .eq("owner_id", ownerId)
      .eq("news_item_id", newsItemId);
    ensureMutationSuccess(deleteTickerError, "Failed to reset news ticker links.");

    if (tickerIds.length > 0) {
      const { error } = await client.from("news_item_tickers").insert(
        tickerIds.map((tickerId) => ({
          owner_id: ownerId,
          news_item_id: newsItemId,
          ticker_id: tickerId,
        })),
      );
      ensureMutationSuccess(error, "Failed to save news tickers.");
    }
  }
}

async function syncFollowUp(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  ownerId: string,
  newsItemId: string,
  payload: NewsMutationInput,
) {
  if (payload.directionalView === "Neutral") {
    const { error } = await client
      .from("follow_up_records")
      .delete()
      .eq("owner_id", ownerId)
      .eq("news_item_id", newsItemId);
    ensureMutationSuccess(error, "Failed to clear follow-up.");
    return;
  }

  const copy = buildFollowUpCopy(payload.followUpStatus, payload.followUpNote);
  const { data: existing, error: existingError } = await client
    .from("follow_up_records")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId)
    .maybeSingle();
  ensureMutationSuccess(existingError, "Failed to look up follow-up.");

  if (existing?.id) {
    const { error } = await client
      .from("follow_up_records")
      .update({
        status: payload.followUpStatus,
        ...copy,
      })
      .eq("owner_id", ownerId)
      .eq("id", existing.id);
    ensureMutationSuccess(error, "Failed to update follow-up.");
    return;
  }

  const { error } = await client.from("follow_up_records").insert({
    owner_id: ownerId,
    news_item_id: newsItemId,
    status: payload.followUpStatus,
    ...copy,
  });
  ensureMutationSuccess(error, "Failed to create follow-up.");
}

export async function POST(request: Request) {
  try {
    assertInternalAssistantRequest(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized." },
      { status: 401 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = internalNewsIngestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (body.operation === "delete") {
      const resolvedId = await resolveEntityId(client, "news_items", ownerId, body.id);
      const { error } = await client
        .from("news_items")
        .delete()
        .eq("owner_id", ownerId)
        .eq("id", resolvedId);
      ensureMutationSuccess(error, "Failed to delete news item.");
    } else if (body.id) {
      // Patch / update existing news item; any subset of fields is allowed.
      const resolvedId = await resolveEntityId(client, "news_items", ownerId, body.id);

      const themeIds =
        body.relatedThemeIds && body.relatedThemeIds.length > 0
          ? await resolveThemeIds(client, ownerId, body.relatedThemeIds)
          : body.relatedThemeIds;
      const tickerIds =
        body.relatedTickerIds && body.relatedTickerIds.length > 0
          ? await resolveTickerIds(client, ownerId, body.relatedTickerIds)
          : body.relatedTickerIds;

      const patchRow = toNewsPatchRow(body as NewsPatchInput);
      if (Object.keys(patchRow).length > 0) {
        const { error } = await client
          .from("news_items")
          .update(patchRow)
          .eq("owner_id", ownerId)
          .eq("id", resolvedId);
        ensureMutationSuccess(error, "Failed to update news item.");
      }

      // Only resync relations if the assistant explicitly sent them.
      const shouldSyncThemes = Array.isArray(body.relatedThemeIds) && body.relatedThemeIds.length > 0;
      const shouldSyncTickers = Array.isArray(body.relatedTickerIds) && body.relatedTickerIds.length > 0;
      await syncNewsRelations(
        client,
        ownerId,
        resolvedId,
        shouldSyncThemes ? themeIds : undefined,
        shouldSyncTickers ? tickerIds : undefined,
      );

      if (body.directionalView && body.followUpStatus !== undefined) {
        await syncFollowUp(client, ownerId, resolvedId, body as NewsMutationInput);
      }

      if (body.images && body.images.length > 0) {
        await attachInitialNewsImages(client, ownerId, resolvedId, body.images);
      }

      if (body.imageOperations) {
        await applyNewsImageOperations(client, ownerId, resolvedId, body.imageOperations);
      }
    } else {
      // Create new news item; all required fields enforced by zod.
      const normalizedPayload: NewsMutationInput = {
        ...(body as NewsMutationInput),
        relatedThemeIds: await resolveThemeIds(client, ownerId, body.relatedThemeIds ?? []),
        relatedTickerIds: await resolveTickerIds(client, ownerId, body.relatedTickerIds ?? []),
      };

      const { data, error } = await client
        .from("news_items")
        .insert({
          owner_id: ownerId,
          ...toFullNewsRow(normalizedPayload),
        })
        .select("id")
        .single();
      ensureMutationSuccess(error, "Failed to create news item.");
      if (!data?.id) {
        throw new Error("Failed to create news item id.");
      }

      await syncNewsRelations(
        client,
        ownerId,
        data.id,
        normalizedPayload.relatedThemeIds,
        normalizedPayload.relatedTickerIds,
      );
      await syncFollowUp(client, ownerId, data.id, normalizedPayload);

      if (body.images && body.images.length > 0) {
        await attachInitialNewsImages(client, ownerId, data.id, body.images);
      }
    }

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json({
      ok: true,
      message: "News ingest completed.",
      dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal news ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
