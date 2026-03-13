import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import { getResearchDatasetSummary } from "@/lib/server/telegram-search";
import { resolveResearchOwnerId } from "@/lib/server/private-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertInternalAssistantRequest(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized." },
      { status: 401 },
    );
  }

  const client = createServiceRoleSupabaseClient();

  try {
    await resolveResearchOwnerId(client, "assistant-system");
    const counts = await getResearchDatasetSummary(client);

    return NextResponse.json({
      ok: true,
      counts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal dataset summary failed." },
      { status: 500 },
    );
  }
}
