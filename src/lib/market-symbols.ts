const REPRESENTATIVE_SYMBOL_ALIASES: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
};

export function normalizeRepresentativeMarketSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return REPRESENTATIVE_SYMBOL_ALIASES[normalized] ?? normalized;
}
