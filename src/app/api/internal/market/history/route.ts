import { NextResponse } from "next/server";

import { fetchTickerHistory } from "@/lib/market-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol." }, { status: 400 });
  }

  try {
    const history = await fetchTickerHistory(symbol);
    return NextResponse.json({ ok: true, symbol, history }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch market history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
