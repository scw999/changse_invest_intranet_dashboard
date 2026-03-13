import { NextResponse } from "next/server";

import { requirePrivateRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  buildFollowUpCopy,
  ensureMutationSuccess,
  resolveResearchOwnerId,
  type NewsMutationInput,
} from "@/lib/server/private-admin";

async function readBody(request: Request) {
  return (await request.json().catch(() => null)) as
    | (Partial<NewsMutationInput> & { id?: string })
    | null;
}

function isNewsPayload(value: Partial<NewsMutationInput> | null): value is NewsMutationInput {
  return Boolean(
    value &&
      typeof value.title === "string" &&
      typeof value.summary === "string" &&
      typeof value.sourceName === "string" &&
      typeof value.sourceUrl === "string" &&
      typeof value.publishedAt === "string" &&
      typeof value.scanSlot === "string" &&
      typeof value.region === "string" &&
      Array.isArray(value.affectedAssetClasses) &&
      Array.isArray(value.relatedThemeIds) &&
      Array.isArray(value.relatedTickerIds) &&
      typeof value.marketInterpretation === "string" &&
      typeof value.directionalView === "string" &&
      typeof value.actionIdea === "string" &&
      typeof value.followUpStatus === "string" &&
      typeof value.followUpNote === "string" &&
      typeof value.importance === "string",
  );
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

function toNewsRow(payload: NewsMutationInput) {
  return {
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
  };
}

async function respondWithDataset(client: ReturnType<typeof createServiceRoleSupabaseClient>) {
  const dataset = await fetchResearchDataset(client);
  return NextResponse.json(dataset, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = await readBody(request);

  if (!viewer || !isNewsPayload(body)) {
    return NextResponse.json({ error: "Invalid news payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    const { data, error } = await client
      .from("news_items")
      .insert({
        owner_id: ownerId,
        ...toNewsRow(body),
      })
      .select("id")
      .single();
    ensureMutationSuccess(error, "Failed to create news item.");
    if (!data?.id) {
      throw new Error("Failed to create news item id.");
    }

    await syncNewsRelations(client, ownerId, data.id, body);
    await syncFollowUp(client, ownerId, data.id, body);

    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create news item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const rawBody = await readBody(request);
  const newsId = rawBody?.id;
  const body = rawBody as NewsMutationInput | null;

  if (!viewer || !newsId || !isNewsPayload(body)) {
    return NextResponse.json({ error: "Invalid news update payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    const { error } = await client
      .from("news_items")
      .update(toNewsRow(body))
      .eq("owner_id", ownerId)
      .eq("id", newsId);
    ensureMutationSuccess(error, "Failed to update news item.");

    await syncNewsRelations(client, ownerId, newsId, body);
    await syncFollowUp(client, ownerId, newsId, body);

    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update news item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as { id?: string } | null;

  if (!viewer || !body?.id) {
    return NextResponse.json({ error: "News item id is required." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    const { error } = await client
      .from("news_items")
      .delete()
      .eq("owner_id", ownerId)
      .eq("id", body.id);
    ensureMutationSuccess(error, "Failed to delete news item.");

    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete news item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
