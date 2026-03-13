import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  deletePortfolioItem,
  resolveEntityId,
  resolveResearchOwnerId,
  updateUserPreferences,
  upsertPortfolioItem,
  type PortfolioItemMutationInput,
  type PreferencesMutationInput,
} from "@/lib/server/private-admin";

export const dynamic = "force-dynamic";

type PortfolioIngestBody =
  | ({ operation: "upsert_item" } & PortfolioItemMutationInput)
  | { operation: "delete_item"; id: string }
  | { operation: "update_preferences"; preferences: PreferencesMutationInput };

function isPortfolioPayload(
  value: Partial<PortfolioItemMutationInput> | null,
): value is PortfolioItemMutationInput {
  return Boolean(
    value &&
      typeof value.symbol === "string" &&
      typeof value.assetName === "string" &&
      typeof value.assetType === "string" &&
      typeof value.region === "string" &&
      typeof value.isHolding === "boolean" &&
      typeof value.isWatchlist === "boolean" &&
      typeof value.priority === "string",
  );
}

export async function POST(request: Request) {
  try {
    assertInternalAssistantRequest(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PortfolioIngestBody | null;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (!body) {
      return NextResponse.json({ error: "Invalid ingest payload." }, { status: 400 });
    }

    if (body.operation === "delete_item") {
      const resolvedId = await resolveEntityId(client, "portfolio_items", ownerId, body.id);
      await deletePortfolioItem(client, ownerId, resolvedId);
    } else if (body.operation === "update_preferences") {
      await updateUserPreferences(client, ownerId, body.preferences);
    } else {
      if (!isPortfolioPayload(body)) {
        return NextResponse.json({ error: "Invalid portfolio ingest payload." }, { status: 400 });
      }
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
