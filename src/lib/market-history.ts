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

type NaverPricePoint = {
  localTradedAt?: string;
  closePrice?: string;
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function isKoreanTicker(symbol: string) {
  return /^\d{6}\.(KS|KQ)$/.test(symbol);
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

async function fetchYahooHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
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
    throw new Error(`Yahoo Finance returned ${response.status}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const apiError = payload.chart?.error?.description;
  if (apiError) {
    throw new Error(apiError);
  }

  const history = parseYahooChart(payload);
  if (history.length === 0) {
    throw new Error(`Yahoo Finance returned no chart data for ${symbol}`);
  }

  return history;
}

async function fetchNaverHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const localCode = symbol.split(".")[0];
  const pages = await Promise.all(
    [1, 2, 3].map(async (page) => {
      const url = new URL(`https://m.stock.naver.com/api/stock/${localCode}/price`);
      url.searchParams.set("pageSize", "60");
      url.searchParams.set("page", String(page));

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 60 * 60 },
      });

      if (!response.ok) {
        throw new Error(`Naver Finance returned ${response.status}`);
      }

      return (await response.json()) as NaverPricePoint[];
    }),
  );

  const history = pages
    .flat()
    .map((point) => {
      const time = point.localTradedAt?.trim();
      const value = Number(point.closePrice?.replaceAll(",", ""));
      if (!time || !Number.isFinite(value)) {
        return null;
      }

      return { time, value } satisfies MarketHistoryPoint;
    })
    .filter((point): point is MarketHistoryPoint => point !== null)
    .reverse()
    .slice(-180);

  if (history.length === 0) {
    throw new Error(`Naver Finance returned no chart data for ${symbol}`);
  }

  return history;
}

export async function fetchTickerHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const normalizedSymbol = normalizeSymbol(symbol);

  try {
    return await fetchYahooHistory(normalizedSymbol);
  } catch (error) {
    if (!isKoreanTicker(normalizedSymbol)) {
      throw error;
    }

    return fetchNaverHistory(normalizedSymbol);
  }
}
