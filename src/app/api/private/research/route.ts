import { NextResponse } from "next/server";

import { requirePrivateRouteRequest } from "@/lib/auth/route";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { fetchResearchDataset } from "@/lib/supabase/research";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = await requirePrivateRouteRequest(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const dataset = await fetchResearchDataset(createServiceRoleSupabaseClient());

    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read the private research dataset.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
