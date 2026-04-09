export type MarketHistoryPoint = {
  time: string;
  value: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      description?: string;
    } | null;
  };
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function toIsoDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function parseYahooChart(payload: YahooChartResponse): MarketHistoryPoint[] {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((timestamp, index) => {
      const value = closes[index];
      if (!Number.isFinite(timestamp) || typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      return {
        time: toIsoDate(timestamp),
        value,
      } satisfies MarketHistoryPoint;
    })
    .filter((point): point is MarketHistoryPoint => point !== null)
    .slice(-180);
}

export async function fetchTickerHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`);
  url.searchParams.set("range", "6mo");
  url.searchParams.set("interval", "1d");
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market history for ${symbol}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const apiError = payload.chart?.error?.description;
  if (apiError) {
    throw new Error(apiError);
  }

  return parseYahooChart(payload);
}
