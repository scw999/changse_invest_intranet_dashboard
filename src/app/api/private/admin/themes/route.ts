import { NextResponse } from "next/server";

import { requireAdminRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  ensureMutationSuccess,
  resolveResearchOwnerId,
  upsertTheme,
  type ThemeMutationInput,
} from "@/lib/server/private-admin";

function isThemePayload(value: Partial<ThemeMutationInput> | null): value is ThemeMutationInput {
  return Boolean(
    value &&
      typeof value.name === "string" &&
      typeof value.description === "string" &&
      typeof value.category === "string" &&
      typeof value.priority === "string" &&
      typeof value.color === "string" &&
      (value.slug === undefined || typeof value.slug === "string"),
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
  const body = (await request.json().catch(() => null)) as Partial<ThemeMutationInput> | null;

  if (!viewer || !isThemePayload(body)) {
    return NextResponse.json({ error: "Invalid theme payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    await upsertTheme(client, ownerId, body);

    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create theme.";
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
    return NextResponse.json({ error: "Theme id is required." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    const { error } = await client
      .from("themes")
      .delete()
      .eq("owner_id", ownerId)
      .eq("id", body.id);
    ensureMutationSuccess(error, "Failed to delete theme.");

    return respondWithDataset(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete theme.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
