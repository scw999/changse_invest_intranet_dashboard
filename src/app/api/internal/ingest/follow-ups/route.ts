import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import {
  formatZodError,
  internalFollowUpIngestSchema,
} from "@/lib/server/assistant-ingest";
import {
  buildFollowUpCopy,
  ensureMutationSuccess,
  resolveEntityId,
  resolveResearchOwnerId,
} from "@/lib/server/private-admin";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const parsed = internalFollowUpIngestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");
  const resolvedNewsId = await resolveEntityId(client, "news_items", ownerId, body.newsItemId);
  const copy = buildFollowUpCopy(body.status, body.resultNote);

  try {
    const { data: existing, error: existingError } = await client
      .from("follow_up_records")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("news_item_id", resolvedNewsId)
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
        news_item_id: resolvedNewsId,
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
      .eq("id", resolvedNewsId);
    ensureMutationSuccess(newsError, "Failed to update linked news follow-up fields.");

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json({
      ok: true,
      message: "Follow-up ingest completed.",
      dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal follow-up ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
