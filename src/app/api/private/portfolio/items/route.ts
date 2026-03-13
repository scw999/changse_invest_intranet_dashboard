import { NextResponse } from "next/server";

import { requireAdminRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  deletePortfolioItem,
  resolveResearchOwnerId,
  upsertPortfolioItem,
  type PortfolioItemMutationInput,
} from "@/lib/server/private-admin";

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

async function respondWithDataset(client: ReturnType<typeof createServiceRoleSupabaseClient>) {
  const dataset = await fetchResearchDataset(client);
  return NextResponse.json(dataset, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  const authResponse = await requireAdminRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as Partial<PortfolioItemMutationInput> | null;

  if (!viewer || !isPortfolioPayload(body)) {
    return NextResponse.json({ error: "Invalid portfolio item payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    await upsertPortfolioItem(client, ownerId, body);
    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save portfolio item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authResponse = await requireAdminRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as { id?: string } | null;

  if (!viewer || !body?.id) {
    return NextResponse.json({ error: "Portfolio item id is required." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    await deletePortfolioItem(client, ownerId, body.id);
    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete portfolio item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
