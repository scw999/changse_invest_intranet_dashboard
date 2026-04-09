import type { Ticker } from "@/types/research";

export const DEFAULT_CRYPTO_TICKERS: Ticker[] = [
  {
    id: "ticker-btc",
    symbol: "BTC-USD",
    name: "Bitcoin",
    exchange: "Crypto",
    region: "GLOBAL",
    assetClass: "Crypto",
    note: "Sentiment and liquidity-sensitive macro risk barometer.",
  },
  {
    id: "ticker-eth",
    symbol: "ETH-USD",
    name: "Ethereum",
    exchange: "Crypto",
    region: "GLOBAL",
    assetClass: "Crypto",
    note: "High-beta crypto beta tied to risk appetite, on-chain activity, and liquidity conditions.",
  },
];

export function mergeDefaultCryptoTickers(tickers: Ticker[]): Ticker[] {
  const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol.toUpperCase(), ticker]));

  for (const ticker of DEFAULT_CRYPTO_TICKERS) {
    if (!bySymbol.has(ticker.symbol.toUpperCase())) {
      bySymbol.set(ticker.symbol.toUpperCase(), ticker);
    }
  }

  return Array.from(bySymbol.values());
}
