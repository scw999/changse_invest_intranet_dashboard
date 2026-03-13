import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import {
  formatZodError,
  internalPortfolioIngestSchema,
} from "@/lib/server/assistant-ingest";
import {
  deletePortfolioItem,
  resolveEntityId,
  resolveResearchOwnerId,
  resolveThemeIds,
  updateUserPreferences,
  upsertPortfolioItem,
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
  const parsed = internalPortfolioIngestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const body = parsed.data;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (body.operation === "delete_item") {
      const resolvedId = await resolveEntityId(client, "portfolio_items", ownerId, body.id);
      await deletePortfolioItem(client, ownerId, resolvedId);
    } else if (body.operation === "update_preferences") {
      const interestThemeIds = body.preferences.interestThemeIds
        ? await resolveThemeIds(client, ownerId, body.preferences.interestThemeIds)
        : undefined;

      await updateUserPreferences(client, ownerId, {
        ...body.preferences,
        ...(interestThemeIds ? { interestThemeIds } : {}),
      });
    } else {
      const resolvedId = body.id
        ? await resolveEntityId(client, "portfolio_items", ownerId, body.id)
        : undefined;
      await upsertPortfolioItem(client, ownerId, {
        ...body,
        ...(resolvedId ? { id: resolvedId } : {}),
      });
    }

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json({
      ok: true,
      message: "Portfolio ingest completed.",
      dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal portfolio ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
