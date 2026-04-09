import { normalizeRepresentativeMarketSymbol } from "@/lib/market-symbols";

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

type NasdaqHistoricalResponse = {
  data?: {
    tradesTable?: {
      rows?: Array<{
        date?: string;
        close?: string;
      }>;
    };
  } | null;
};

type CoinbaseCandle = [
  time: number,
  low: number,
  high: number,
  open: number,
  close: number,
  volume: number,
];

function normalizeSymbol(symbol: string) {
  return normalizeRepresentativeMarketSymbol(symbol);
}

function isKoreanTicker(symbol: string) {
  return /^\d{6}\.(KS|KQ)$/.test(symbol);
}

function isRepresentativeCryptoTicker(symbol: string) {
  return /^(BTC|ETH)-USD$/.test(symbol);
}

function isCryptoTicker(symbol: string) {
  return /^[A-Z]+-USD$/i.test(symbol);
}

function toIsoDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function toStooqSymbol(symbol: string) {
  const normalized = symbol.trim().toLowerCase();
  if (normalized.includes('.')) {
    return normalized;
  }

  return `${normalized}.us`;
}

function toNumber(value: string | undefined) {
  if (!value) {
    return Number.NaN;
  }

  return Number(value.replaceAll(/[$,]/g, ""));
}

function toUsIsoDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [month, day, year] = value.split("/").map((part) => Number(part));
  if (![month, day, year].every((part) => Number.isFinite(part))) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseYahooChart(payload: YahooChartResponse): MarketHistoryPoint[] {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((timestamp, index) => {
      const value = closes[index];
      if (!Number.isFinite(timestamp) || typeof value !== 'number' || !Number.isFinite(value)) {
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

function parseStooqCsv(csv: string): MarketHistoryPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split(','))
    .filter((cols) => cols.length >= 5)
    .map((cols) => ({
      time: cols[0]?.trim(),
      value: Number(cols[4]),
    }))
    .filter((point) => point.time && Number.isFinite(point.value));
}

async function fetchJson(url: URL | string): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
        Referer: 'https://finance.yahoo.com/',
        Origin: 'https://finance.yahoo.com',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYahooHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  const failures: string[] = [];

  for (const host of hosts) {
    const url = new URL(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set('range', '6mo');
    url.searchParams.set('interval', '1d');
    url.searchParams.set('includePrePost', 'false');
    url.searchParams.set('events', 'div,splits');

    try {
      const { response, text } = await fetchJson(url);
      if (!response.ok) {
        throw new Error(`${host} returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`${host} returned non-JSON content-type ${contentType || 'unknown'}`);
      }

      const payload = JSON.parse(text) as YahooChartResponse;
      const apiError = payload.chart?.error?.description;
      if (apiError) {
        throw new Error(apiError);
      }

      const history = parseYahooChart(payload);
      if (history.length === 0) {
        throw new Error(`Yahoo Finance returned no chart data for ${symbol}`);
      }

      return history;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${host}: ${message}`);
    }
  }

  throw new Error(`Yahoo Finance failed for ${symbol} (${failures.join('; ')})`);
}

async function fetchNaverHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const localCode = symbol.split('.')[0];
  const pages = await Promise.all(
    [1, 2, 3].map(async (page) => {
      const url = new URL(`https://m.stock.naver.com/api/stock/${localCode}/price`);
      url.searchParams.set('pageSize', '60');
      url.searchParams.set('page', String(page));

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://m.stock.naver.com/',
          Origin: 'https://m.stock.naver.com',
        },
        cache: 'no-store',
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
      const value = Number(point.closePrice?.replaceAll(',', ''));
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

async function fetchCoinbaseHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 60 * 60 * 24 * 180;
  const url = new URL(`https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}/candles`);
  url.searchParams.set('granularity', '86400');
  url.searchParams.set('start', new Date(start * 1000).toISOString());
  url.searchParams.set('end', new Date(now * 1000).toISOString());

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Coinbase returned ${response.status}`);
  }

  const payload = (await response.json()) as CoinbaseCandle[];
  const history = payload
    .map((candle) => {
      const [time, , , , close] = candle;
      if (!Number.isFinite(time) || !Number.isFinite(close)) {
        return null;
      }

      return {
        time: toIsoDate(time),
        value: close,
      } satisfies MarketHistoryPoint;
    })
    .filter((point): point is MarketHistoryPoint => point !== null)
    .sort((left, right) => left.time.localeCompare(right.time))
    .slice(-180);

  if (history.length === 0) {
    throw new Error(`Coinbase returned no chart data for ${symbol}`);
  }

  return history;
}

async function fetchNasdaqHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setMonth(fromDate.getMonth() - 8);

  const assetClasses = ['stocks', 'etf', 'index'];
  const failures: string[] = [];

  for (const assetClass of assetClasses) {
    const url = new URL(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical`);
    url.searchParams.set('assetclass', assetClass);
    url.searchParams.set('fromdate', fromDate.toISOString().slice(0, 10));
    url.searchParams.set('todate', today.toISOString().slice(0, 10));
    url.searchParams.set('limit', '365');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: `https://www.nasdaq.com/market-activity/${assetClass}/${symbol.toLowerCase()}/historical`,
          Origin: 'https://www.nasdaq.com',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Nasdaq returned ${response.status}`);
      }

      const payload = (await response.json()) as NasdaqHistoricalResponse;
      const rows = payload.data?.tradesTable?.rows ?? [];
      const history = rows
        .map((row) => {
          const time = toUsIsoDate(row.date);
          const value = toNumber(row.close);
          if (!time || !Number.isFinite(value)) {
            return null;
          }

          return { time, value } satisfies MarketHistoryPoint;
        })
        .filter((point): point is MarketHistoryPoint => point !== null)
        .reverse()
        .slice(-180);

      if (history.length === 0) {
        throw new Error(`Nasdaq returned no chart data for ${symbol}`);
      }

      return history;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${assetClass}: ${message}`);
    }
  }

  throw new Error(`Nasdaq failed for ${symbol} (${failures.join('; ')})`);
}

async function fetchStooqHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const stooqSymbol = toStooqSymbol(symbol);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Stooq returned ${response.status}`);
  }

  const csv = await response.text();
  const history = parseStooqCsv(csv).slice(-180);
  if (history.length === 0) {
    throw new Error(`Stooq returned no chart data for ${symbol}`);
  }

  return history;
}

export async function fetchTickerHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const providers: Array<{ name: string; fetcher: () => Promise<MarketHistoryPoint[]> }> = isRepresentativeCryptoTicker(
    normalizedSymbol,
  )
    ? [
        { name: 'Coinbase', fetcher: () => fetchCoinbaseHistory(normalizedSymbol) },
        { name: 'Yahoo Finance', fetcher: () => fetchYahooHistory(normalizedSymbol) },
      ]
    : [
        { name: 'Yahoo Finance', fetcher: () => fetchYahooHistory(normalizedSymbol) },
        ...(isCryptoTicker(normalizedSymbol)
          ? []
          : isKoreanTicker(normalizedSymbol)
            ? [{ name: 'Naver Finance', fetcher: () => fetchNaverHistory(normalizedSymbol) }]
            : [{ name: 'Nasdaq', fetcher: () => fetchNasdaqHistory(normalizedSymbol) },
               { name: 'Stooq', fetcher: () => fetchStooqHistory(normalizedSymbol) }]),
      ];
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      return await provider.fetcher();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.name}: ${message}`);
    }
  }

  throw new Error(`Failed to fetch market history for ${normalizedSymbol} (${failures.join('; ')})`);
}
