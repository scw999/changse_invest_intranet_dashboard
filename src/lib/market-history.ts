export type MarketHistoryPoint = {
  time: string;
  value: number;
};

function toStooqSymbol(symbol: string) {
  const normalized = symbol.trim().toLowerCase();
  if (normalized.includes(".")) {
    return normalized;
  }
  return `${normalized}.us`;
}

function parseCsv(csv: string): MarketHistoryPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  return lines
    .slice(1)
    .map((line) => line.split(","))
    .filter((cols) => cols.length >= 5)
    .map((cols) => ({
      time: cols[0]?.trim(),
      value: Number(cols[4]),
    }))
    .filter((point) => point.time && Number.isFinite(point.value));
}

export async function fetchTickerHistory(symbol: string): Promise<MarketHistoryPoint[]> {
  const stooqSymbol = toStooqSymbol(symbol);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "changse-invest-dashboard/0.1",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market history for ${symbol}`);
  }

  const csv = await response.text();
  return parseCsv(csv).slice(-180);
}
