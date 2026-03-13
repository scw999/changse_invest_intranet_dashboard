import { NextResponse } from "next/server";

import { requirePrivateRouteRequest } from "@/lib/auth/route";
import { getViewer } from "@/lib/auth/session";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  resolveResearchOwnerId,
  updateUserPreferences,
  type PreferencesMutationInput,
} from "@/lib/server/private-admin";

export async function PATCH(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as PreferencesMutationInput | null;

  if (!viewer || !body) {
    return NextResponse.json({ error: "Invalid preferences payload." }, { status: 400 });
  }

  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, viewer.id);

  try {
    await updateUserPreferences(client, ownerId, body);
    const dataset = await fetchResearchDataset(client);
    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
