import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  deleteTheme,
  resolveEntityId,
  resolveResearchOwnerId,
  upsertTheme,
  type ThemeMutationInput,
} from "@/lib/server/private-admin";

export const dynamic = "force-dynamic";

type ThemeIngestBody =
  | ({ operation: "upsert" } & ThemeMutationInput)
  | { operation: "delete"; id: string };

function isThemePayload(value: Partial<ThemeMutationInput> | null): value is ThemeMutationInput {
  return Boolean(
    value &&
      typeof value.name === "string" &&
      typeof value.description === "string" &&
      typeof value.category === "string" &&
      typeof value.priority === "string" &&
      typeof value.color === "string",
  );
}

export async function POST(request: Request) {
  try {
    assertInternalAssistantRequest(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as ThemeIngestBody | null;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (!body) {
      return NextResponse.json({ error: "Invalid ingest payload." }, { status: 400 });
    }

    if (body.operation === "delete") {
      const resolvedId = await resolveEntityId(client, "themes", ownerId, body.id);
      await deleteTheme(client, ownerId, resolvedId);
    } else {
      if (!isThemePayload(body)) {
        return NextResponse.json({ error: "Invalid theme ingest payload." }, { status: 400 });
      }

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
