import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import {
  formatZodError,
  internalNewsIngestSchema,
} from "@/lib/server/assistant-ingest";
import {
  buildFollowUpCopy,
  ensureMutationSuccess,
  resolveEntityId,
  resolveResearchOwnerId,
  resolveThemeIds,
  resolveTickerIds,
  type NewsMutationInput,
} from "@/lib/server/private-admin";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toNewsRow(payload: NewsMutationInput) {
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
    content_meta: payload.monitoring ? { monitoring: payload.monitoring } : {},
  };
}

async function syncNewsRelations(
  client: ReturnType<typeof createServiceRoleSupabaseClient>,
  ownerId: string,
  newsItemId: string,
  payload: NewsMutationInput,
) {
  const { error: deleteThemeError } = await client
    .from("news_item_themes")
    .delete()
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId);
  ensureMutationSuccess(deleteThemeError, "Failed to reset news theme links.");

  const { error: deleteTickerError } = await client
    .from("news_item_tickers")
    .delete()
    .eq("owner_id", ownerId)
    .eq("news_item_id", newsItemId);
  ensureMutationSuccess(deleteTickerError, "Failed to reset news ticker links.");

  if (payload.relatedThemeIds.length > 0) {
    const { error } = await client.from("news_item_themes").insert(
      payload.relatedThemeIds.map((themeId) => ({
        owner_id: ownerId,
        news_item_id: newsItemId,
        theme_id: themeId,
      })),
    );
    ensureMutationSuccess(error, "Failed to save news themes.");
  }

  if (payload.relatedTickerIds.length > 0) {
    const { error } = await client.from("news_item_tickers").insert(
      payload.relatedTickerIds.map((tickerId) => ({
        owner_id: ownerId,
        news_item_id: newsItemId,
        ticker_id: tickerId,
      })),
    );
    ensureMutationSuccess(error, "Failed to save news tickers.");
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
    } else {
      const normalizedPayload: NewsMutationInput = {
        ...body,
        relatedThemeIds: await resolveThemeIds(client, ownerId, body.relatedThemeIds),
        relatedTickerIds: await resolveTickerIds(client, ownerId, body.relatedTickerIds),
      };

      if (body.id) {
        const resolvedId = await resolveEntityId(client, "news_items", ownerId, body.id);
        const { error } = await client
          .from("news_items")
          .update(toNewsRow(normalizedPayload))
          .eq("owner_id", ownerId)
          .eq("id", resolvedId);
        ensureMutationSuccess(error, "Failed to update news item.");
        await syncNewsRelations(client, ownerId, resolvedId, normalizedPayload);
        await syncFollowUp(client, ownerId, resolvedId, normalizedPayload);
      } else {
        const { data, error } = await client
          .from("news_items")
          .insert({
            owner_id: ownerId,
            ...toNewsRow(normalizedPayload),
          })
          .select("id")
          .single();
        ensureMutationSuccess(error, "Failed to create news item.");
        if (!data?.id) {
          throw new Error("Failed to create news item id.");
        }

        await syncNewsRelations(client, ownerId, data.id, normalizedPayload);
        await syncFollowUp(client, ownerId, data.id, normalizedPayload);
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
