import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import {
  formatZodError,
  internalThemeIngestSchema,
} from "@/lib/server/assistant-ingest";
import {
  deleteTheme,
  resolveEntityId,
  resolveResearchOwnerId,
  upsertTheme,
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
  const parsed = internalThemeIngestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (body.operation === "delete") {
      const resolvedId = await resolveEntityId(client, "themes", ownerId, body.id);
      await deleteTheme(client, ownerId, resolvedId);
    } else {
      const resolvedId = body.id
        ? await resolveEntityId(client, "themes", ownerId, body.id)
        : undefined;
      await upsertTheme(client, ownerId, {
        ...body,
        ...(resolvedId ? { id: resolvedId } : {}),
      });
    }

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json({
      ok: true,
      message: "Theme ingest completed.",
      dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal theme ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
