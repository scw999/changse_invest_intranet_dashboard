import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { fetchResearchDataset } from "@/lib/supabase/research";

export const dynamic = "force-dynamic";

export async function GET() {
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
