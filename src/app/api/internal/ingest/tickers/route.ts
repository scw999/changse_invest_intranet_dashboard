import { NextResponse } from "next/server";

import { assertInternalAssistantRequest } from "@/lib/auth/internal";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  deleteTicker,
  resolveEntityId,
  resolveResearchOwnerId,
  upsertTicker,
  type TickerMutationInput,
} from "@/lib/server/private-admin";

export const dynamic = "force-dynamic";

type TickerIngestBody =
  | ({ operation: "upsert" } & TickerMutationInput)
  | { operation: "delete"; id: string };

function isTickerPayload(value: Partial<TickerMutationInput> | null): value is TickerMutationInput {
  return Boolean(
    value &&
      typeof value.symbol === "string" &&
      typeof value.name === "string" &&
      typeof value.exchange === "string" &&
      typeof value.region === "string" &&
      typeof value.assetClass === "string" &&
      typeof value.note === "string",
  );
}

export async function POST(request: Request) {
  try {
    assertInternalAssistantRequest(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TickerIngestBody | null;
  const client = createServiceRoleSupabaseClient();
  const ownerId = await resolveResearchOwnerId(client, "assistant-system");

  try {
    if (!body) {
      return NextResponse.json({ error: "Invalid ingest payload." }, { status: 400 });
    }

    if (body.operation === "delete") {
      const resolvedId = await resolveEntityId(client, "tickers", ownerId, body.id);
      await deleteTicker(client, ownerId, resolvedId);
    } else {
      if (!isTickerPayload(body)) {
        return NextResponse.json({ error: "Invalid ticker ingest payload." }, { status: 400 });
      }
      const resolvedId = body.id
        ? await resolveEntityId(client, "tickers", ownerId, body.id)
        : undefined;
      await upsertTicker(client, ownerId, {
        ...body,
        ...(resolvedId ? { id: resolvedId } : {}),
      });
    }

    const dataset = await fetchResearchDataset(client);
    return NextResponse.json({
      ok: true,
      message: "Ticker ingest completed.",
      dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal ticker ingest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
