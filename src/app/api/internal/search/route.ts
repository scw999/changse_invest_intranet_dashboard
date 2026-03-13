import { NextResponse } from "next/server";
import { z } from "zod";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import { resolveResearchOwnerId } from "@/lib/server/private-admin";
import {
  type SearchScope,
  searchResearchDataset,
} from "@/lib/server/telegram-search";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { CONTENT_TYPES } from "@/types/research";

export const dynamic = "force-dynamic";

const searchRequestSchema = z.object({
  scope: z.enum(["news", "followup", "portfolio", "ticker", "theme"]),
  query: z.string().trim().min(1, "query is required."),
  contentType: z.enum(CONTENT_TYPES).optional(),
});

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
  const parsed = searchRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
      .join(" | ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { scope, query, contentType } = parsed.data;
  const client = createServiceRoleSupabaseClient();

  try {
    await resolveResearchOwnerId(client, "assistant-system");
    const results = await searchResearchDataset(client, scope as SearchScope, query, contentType);

    return NextResponse.json({
      ok: true,
      scope,
      query,
      contentType: contentType ?? null,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal search failed." },
      { status: 500 },
    );
  }
}
