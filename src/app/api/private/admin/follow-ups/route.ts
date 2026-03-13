import { NextResponse } from "next/server";

import { requirePrivateRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  buildFollowUpCopy,
  ensureMutationSuccess,
  resolveResearchOwnerId,
  type FollowUpMutationInput,
} from "@/lib/server/private-admin";

function isFollowUpPayload(
  value: Partial<FollowUpMutationInput> | null,
): value is FollowUpMutationInput {
  return Boolean(
    value &&
      typeof value.newsItemId === "string" &&
      typeof value.status === "string" &&
      typeof value.resultNote === "string",
  );
}

export async function PATCH(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as Partial<FollowUpMutationInput> | null;

  if (!viewer || !isFollowUpPayload(body)) {
    return NextResponse.json({ error: "Invalid follow-up payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);
  const copy = buildFollowUpCopy(body.status, body.resultNote);

  try {
    const { data: existing, error: existingError } = await client
      .from("follow_up_records")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("news_item_id", body.newsItemId)
      .maybeSingle();
    ensureMutationSuccess(existingError, "Failed to load follow-up.");

    if (existing?.id) {
      const { error } = await client
        .from("follow_up_records")
        .update({
          status: body.status,
          ...copy,
        })
        .eq("owner_id", ownerId)
        .eq("id", existing.id);
      ensureMutationSuccess(error, "Failed to update follow-up.");
    } else {
      const { error } = await client.from("follow_up_records").insert({
        owner_id: ownerId,
        news_item_id: body.newsItemId,
        status: body.status,
        ...copy,
      });
      ensureMutationSuccess(error, "Failed to create follow-up.");
    }

    const { error: newsError } = await client
      .from("news_items")
      .update({
        follow_up_status: body.status,
        follow_up_note: body.resultNote.trim(),
      })
      .eq("owner_id", ownerId)
      .eq("id", body.newsItemId);
    ensureMutationSuccess(newsError, "Failed to update news follow-up fields.");

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save follow-up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
