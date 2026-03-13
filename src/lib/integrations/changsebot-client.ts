type SearchScope = "news" | "followup" | "portfolio" | "ticker" | "theme";

type SearchResult = {
  ref: string;
  id: string;
  line: string;
};

type DatasetSummary = {
  themes: number;
  tickers: number;
  newsItems: number;
  followUps: number;
  portfolioItems: number;
};

type NewsPayload = {
  id?: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scanSlot: string;
  region: string;
  affectedAssetClasses: string[];
  relatedThemeIds: string[];
  relatedTickerIds: string[];
  marketInterpretation: string;
  directionalView: string;
  actionIdea: string;
  followUpStatus: string;
  followUpNote: string;
  importance: string;
};

type PortfolioItemPayload = {
  id?: string;
  symbol: string;
  assetName: string;
  assetType: string;
  region: string;
  isHolding: boolean;
  isWatchlist: boolean;
  weight?: number;
  averageCost?: number;
  memo?: string;
  priority: string;
};

type PortfolioPreferencesPayload = {
  timezone?: string;
  preferredSort?: string;
  favoriteSlots?: string[];
  defaultRegions?: string[];
  interestThemeIds?: string[];
  compactMode?: boolean;
};

type TickerPayload = {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  region: string;
  assetClass: string;
  note: string;
};

type ThemePayload = {
  id?: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  color: string;
};

type FollowUpPayload = {
  newsItemId: string;
  status: string;
  resultNote: string;
};

type AssistantIntent = "news" | "portfolio" | "ticker" | "theme" | "followup" | "unknown";

type SearchHint = {
  scope: SearchScope;
  query: string;
};

type TransformResult =
  | {
      intent: "news";
      operation: "upsert" | "delete";
      payload: Partial<NewsPayload> & { id?: string };
      missingFields: string[];
      searchHints: SearchHint[];
    }
  | {
      intent: "portfolio";
      operation: "upsert_item" | "delete_item" | "update_preferences";
      payload:
        | (Partial<PortfolioItemPayload> & { id?: string })
        | { preferences: PortfolioPreferencesPayload }
        | { id: string };
      missingFields: string[];
      searchHints: SearchHint[];
    }
  | {
      intent: "ticker";
      operation: "upsert" | "delete";
      payload: Partial<TickerPayload> & { id?: string };
      missingFields: string[];
      searchHints: SearchHint[];
    }
  | {
      intent: "theme";
      operation: "upsert" | "delete";
      payload: Partial<ThemePayload> & { id?: string };
      missingFields: string[];
      searchHints: SearchHint[];
    }
  | {
      intent: "followup";
      operation: "upsert";
      payload: Partial<FollowUpPayload>;
      missingFields: string[];
      searchHints: SearchHint[];
    }
  | {
      intent: "unknown";
      operation: "unknown";
      payload: Record<string, never>;
      missingFields: string[];
      searchHints: SearchHint[];
    };

type ChangsebotClientConfig = {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
};

type JsonResponse<T> = T & { ok: boolean; error?: string };

const tickerAliasMap: Record<string, string> = {
  삼전: "005930.KS",
  삼성전자: "005930.KS",
  하이닉스: "000660.KS",
  sk하이닉스: "000660.KS",
  엔비디아: "NVDA",
  메타: "META",
  로켓랩: "RKLB",
  효성중공업: "298040.KS",
  iren: "IREN",
};

const fieldAliases: Record<string, string> = {
  title: "title",
  제목: "title",
  summary: "summary",
  요약: "summary",
  source: "sourceName",
  source_name: "sourceName",
  출처: "sourceName",
  url: "sourceUrl",
  source_url: "sourceUrl",
  링크: "sourceUrl",
  published_at: "publishedAt",
  publishedat: "publishedAt",
  발행시각: "publishedAt",
  slot: "scanSlot",
  scan_slot: "scanSlot",
  슬롯: "scanSlot",
  region: "region",
  지역: "region",
  asset_classes: "affectedAssetClasses",
  assets: "affectedAssetClasses",
  자산군: "affectedAssetClasses",
  theme_ids: "relatedThemeIds",
  themes: "relatedThemeIds",
  테마: "relatedThemeIds",
  ticker_ids: "relatedTickerIds",
  tickers: "relatedTickerIds",
  티커: "relatedTickerIds",
  interpretation: "marketInterpretation",
  해석: "marketInterpretation",
  view: "directionalView",
  방향성: "directionalView",
  action: "actionIdea",
  action_idea: "actionIdea",
  액션: "actionIdea",
  follow_up_status: "followUpStatus",
  followup_status: "followUpStatus",
  status: "status",
  팔로업상태: "status",
  note: "resultNote",
  result_note: "resultNote",
  memo: "memo",
  메모: "memo",
  importance: "importance",
  중요도: "importance",
  symbol: "symbol",
  심볼: "symbol",
  asset_name: "assetName",
  name: "name",
  종목명: "assetName",
  asset_type: "assetType",
  holding: "isHolding",
  보유: "isHolding",
  watchlist: "isWatchlist",
  관심종목: "isWatchlist",
  priority: "priority",
  우선순위: "priority",
  exchange: "exchange",
  거래소: "exchange",
  category: "category",
  color: "color",
  news_item_id: "newsItemId",
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeSymbol(value: string) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return trimmed;
  }

  return tickerAliasMap[trimmed.toLowerCase()] ?? tickerAliasMap[trimmed] ?? trimmed.toUpperCase();
}

function inferRegionFromSymbol(symbol?: string) {
  if (!symbol) {
    return undefined;
  }

  return symbol.endsWith(".KS") ? "KR" : "US";
}

function inferSlotFromText(input: string) {
  if (/아침|오전|09/.test(input)) {
    return "09";
  }
  if (/점심|13/.test(input)) {
    return "13";
  }
  if (/저녁|18/.test(input)) {
    return "18";
  }
  if (/밤|야간|22/.test(input)) {
    return "22";
  }

  const hour = new Date().getHours();
  if (hour < 11) {
    return "09";
  }
  if (hour < 16) {
    return "13";
  }
  if (hour < 20) {
    return "18";
  }
  return "22";
}

function inferImportanceFromText(input: string) {
  if (/매우 중요|최상|critical/i.test(input)) {
    return "Critical";
  }
  if (/높음|중요|high/i.test(input)) {
    return "High";
  }
  if (/낮음|low/i.test(input)) {
    return "Low";
  }
  return "Medium";
}

function inferDirectionalView(input: string) {
  if (/강세|상승|bullish|buy|long/i.test(input)) {
    return "Bullish";
  }
  if (/약세|하락|bearish|sell|short/i.test(input)) {
    return "Bearish";
  }
  if (/혼합|mixed/i.test(input)) {
    return "Mixed";
  }
  return "Neutral";
}

function inferFollowUpStatus(input: string) {
  if (/적중|correct|right/i.test(input)) {
    return "Correct";
  }
  if (/오판|wrong|incorrect/i.test(input)) {
    return "Wrong";
  }
  if (/혼합|mixed/i.test(input)) {
    return "Mixed";
  }
  return "Pending";
}

function inferPriority(input: string) {
  return inferImportanceFromText(input);
}

function inferAssetType(symbol?: string) {
  if (!symbol) {
    return "Stock";
  }

  if (/BTC|ETH|SOL/i.test(symbol)) {
    return "Crypto";
  }
  if (/ETF|SOXL|QQQ|SPY/i.test(symbol)) {
    return "ETF";
  }
  return "Stock";
}

function inferAssetClassFromType(assetType?: string) {
  if (!assetType) {
    return "Equities";
  }

  if (assetType === "ETF") {
    return "ETF";
  }
  if (assetType === "Crypto") {
    return "Crypto";
  }
  return "Equities";
}

function inferIntent(input: string): AssistantIntent {
  if (/팔로업|followup|follow-up/i.test(input)) {
    return "followup";
  }
  if (/포트폴리오|관심종목|watchlist/i.test(input)) {
    return "portfolio";
  }
  if (/티커|ticker/i.test(input)) {
    return "ticker";
  }
  if (/테마|theme/i.test(input)) {
    return "theme";
  }
  if (/뉴스|기사|아이디어|해석|전망/i.test(input)) {
    return "news";
  }
  return "unknown";
}

function inferOperation(input: string) {
  if (/삭제|remove|delete/i.test(input)) {
    return "delete";
  }
  if (/설정|preferences|선호/i.test(input)) {
    return "update_preferences";
  }
  return "upsert";
}

function parseLines(input: string) {
  const entries: Record<string, string> = {};

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line || !line.includes(":")) {
      continue;
    }

    const [rawKey, ...rest] = line.split(":");
    const rawValue = rest.join(":").trim();
    const normalizedKey = fieldAliases[normalizeKey(rawKey)] ?? normalizeKey(rawKey);

    if (rawValue) {
      entries[normalizedKey] = rawValue;
    }
  }

  return entries;
}

function parseList(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function extractSymbol(input: string, lines: Record<string, string>) {
  if (lines.symbol) {
    return normalizeSymbol(lines.symbol);
  }

  const aliasMatch = Object.keys(tickerAliasMap).find((alias) => input.includes(alias));
  if (aliasMatch) {
    return normalizeSymbol(aliasMatch);
  }

  const regexMatch = input.match(/\b[A-Z]{2,6}(?:\.[A-Z]{1,4})?\b/);
  return regexMatch ? normalizeSymbol(regexMatch[0]) : undefined;
}

function extractRef(input: string, lines: Record<string, string>) {
  const direct = lines.id ?? lines.newsItemId;
  if (direct) {
    return normalizeText(direct);
  }

  const bracketMatch = input.match(/\[(?:news|portfolio|ticker|theme|followup):([a-z0-9]+)\]/i);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  const looseMatch = input.match(/\b[a-z0-9]{8,}\b/i);
  return looseMatch?.[0];
}

function currentIsoString() {
  return new Date().toISOString();
}

function toBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return /true|yes|y|1|보유|추가|on|관심/i.test(value);
}

function buildNewsDraft(input: string, lines: Record<string, string>, operation: "upsert" | "delete"): TransformResult {
  const ref = extractRef(input, lines);
  if (operation === "delete") {
    return {
      intent: "news",
      operation: "delete",
      payload: { id: ref },
      missingFields: ref ? [] : ["id"],
      searchHints: ref ? [] : [{ scope: "news", query: lines.title ?? input }],
    };
  }

  const symbol = extractSymbol(input, lines);
  const title = lines.title ?? normalizeText(input.replace(/추가해줘|등록해줘|뉴스|아이디어/gi, ""));
  const sourceName = lines.sourceName ?? "";
  const sourceUrl = lines.sourceUrl ?? "";
  const payload: Partial<NewsPayload> = {
    id: ref,
    title,
    summary: lines.summary ?? normalizeText(input),
    sourceName,
    sourceUrl,
    publishedAt: lines.publishedAt ?? currentIsoString(),
    scanSlot: lines.scanSlot ?? inferSlotFromText(input),
    region: lines.region ?? inferRegionFromSymbol(symbol) ?? "KR",
    affectedAssetClasses: parseList(lines.affectedAssetClasses).length
      ? parseList(lines.affectedAssetClasses)
      : ["Equities"],
    relatedThemeIds: parseList(lines.relatedThemeIds).length
      ? parseList(lines.relatedThemeIds)
      : input.includes("반도체")
        ? ["반도체"]
        : [],
    relatedTickerIds: parseList(lines.relatedTickerIds).length
      ? parseList(lines.relatedTickerIds).map(normalizeSymbol)
      : symbol
        ? [symbol]
        : [],
    marketInterpretation: lines.marketInterpretation ?? normalizeText(input),
    directionalView: lines.directionalView ?? inferDirectionalView(input),
    actionIdea: lines.actionIdea ?? "",
    followUpStatus: lines.status ?? inferFollowUpStatus(input),
    followUpNote: lines.resultNote ?? lines.memo ?? "",
    importance: lines.importance ?? inferImportanceFromText(input),
  };

  const missingFields = [
    !payload.title ? "title" : "",
    !payload.sourceName ? "sourceName" : "",
    !payload.sourceUrl ? "sourceUrl" : "",
    !payload.actionIdea ? "actionIdea" : "",
  ].filter(Boolean);

  return {
    intent: "news",
    operation: "upsert",
    payload,
    missingFields,
    searchHints: payload.title ? [{ scope: "news", query: payload.title }] : [],
  };
}

function buildPortfolioDraft(
  input: string,
  lines: Record<string, string>,
  operation: "upsert" | "delete" | "update_preferences",
): TransformResult {
  if (operation === "update_preferences") {
    const payload = {
      preferences: {
        preferredSort: lines.preferredSort,
        favoriteSlots: parseList(lines.favoriteSlots),
        defaultRegions: parseList(lines.defaultRegions),
        interestThemeIds: parseList(lines.interestThemeIds),
        compactMode: lines.compactMode ? /true|1|yes|on/i.test(lines.compactMode) : undefined,
      },
    };

    return {
      intent: "portfolio",
      operation: "update_preferences",
      payload,
      missingFields: [],
      searchHints: [],
    };
  }

  const ref = extractRef(input, lines);
  if (operation === "delete") {
    return {
      intent: "portfolio",
      operation: "delete_item",
      payload: { id: ref ?? "" },
      missingFields: ref ? [] : ["id"],
      searchHints: ref ? [] : [{ scope: "portfolio", query: extractSymbol(input, lines) ?? input }],
    };
  }

  const symbol = extractSymbol(input, lines);
  const payload: Partial<PortfolioItemPayload> = {
    id: ref,
    symbol,
    assetName: lines.assetName ?? lines.name ?? symbol ?? "",
    assetType: lines.assetType ?? inferAssetType(symbol),
    region: lines.region ?? inferRegionFromSymbol(symbol) ?? "US",
    isHolding: lines.isHolding ? toBoolean(lines.isHolding, false) : /보유/i.test(input),
    isWatchlist: lines.isWatchlist ? toBoolean(lines.isWatchlist, false) : /관심종목|watchlist/i.test(input),
    memo: lines.memo ?? normalizeText(input),
    priority: lines.priority ?? inferPriority(input),
  };

  return {
    intent: "portfolio",
    operation: "upsert_item",
    payload,
    missingFields: [!payload.symbol ? "symbol" : "", !payload.assetName ? "assetName" : ""].filter(Boolean),
    searchHints: payload.symbol ? [{ scope: "portfolio", query: payload.symbol }] : [],
  };
}

function buildTickerDraft(input: string, lines: Record<string, string>, operation: "upsert" | "delete"): TransformResult {
  const ref = extractRef(input, lines);
  if (operation === "delete") {
    return {
      intent: "ticker",
      operation: "delete",
      payload: { id: ref },
      missingFields: ref ? [] : ["id"],
      searchHints: ref ? [] : [{ scope: "ticker", query: extractSymbol(input, lines) ?? input }],
    };
  }

  const symbol = extractSymbol(input, lines);
  const payload: Partial<TickerPayload> = {
    id: ref,
    symbol,
    name: lines.name ?? symbol ?? "",
    exchange: lines.exchange ?? (symbol?.endsWith(".KS") ? "KRX" : "NASDAQ"),
    region: lines.region ?? inferRegionFromSymbol(symbol) ?? "US",
    assetClass: lines.assetClass ?? inferAssetClassFromType(lines.assetType ?? inferAssetType(symbol)),
    note: lines.memo ?? normalizeText(input),
  };

  return {
    intent: "ticker",
    operation: "upsert",
    payload,
    missingFields: [!payload.symbol ? "symbol" : "", !payload.name ? "name" : ""].filter(Boolean),
    searchHints: payload.symbol ? [{ scope: "ticker", query: payload.symbol }] : [],
  };
}

function buildThemeDraft(input: string, lines: Record<string, string>, operation: "upsert" | "delete"): TransformResult {
  const ref = extractRef(input, lines);
  const themeName = lines.name ?? normalizeText(input.replace(/테마|추가해줘|등록해줘|삭제해줘/gi, ""));

  if (operation === "delete") {
    return {
      intent: "theme",
      operation: "delete",
      payload: { id: ref },
      missingFields: ref ? [] : ["id"],
      searchHints: ref ? [] : themeName ? [{ scope: "theme", query: themeName }] : [],
    };
  }

  return {
    intent: "theme",
    operation: "upsert",
    payload: {
      id: ref,
      name: themeName,
      description: lines.description ?? normalizeText(input),
      category: lines.category ?? "Sector",
      priority: lines.priority ?? inferPriority(input),
      color: lines.color ?? "#0F766E",
    },
    missingFields: themeName ? [] : ["name"],
    searchHints: themeName ? [{ scope: "theme", query: themeName }] : [],
  };
}

function buildFollowUpDraft(input: string, lines: Record<string, string>): TransformResult {
  const newsItemId = extractRef(input, lines);

  return {
    intent: "followup",
    operation: "upsert",
    payload: {
      newsItemId,
      status: lines.status ?? inferFollowUpStatus(input),
      resultNote: lines.resultNote ?? lines.memo ?? normalizeText(input),
    },
    missingFields: newsItemId ? [] : ["newsItemId"],
    searchHints: newsItemId ? [] : [{ scope: "followup", query: normalizeText(input) }],
  };
}

export function transformNaturalLanguageToAction(input: string): TransformResult {
  const normalizedInput = normalizeText(input);
  const lines = parseLines(normalizedInput);
  const intent = inferIntent(normalizedInput);
  const operation = inferOperation(normalizedInput);

  if (intent === "news") {
    return buildNewsDraft(normalizedInput, lines, operation === "delete" ? "delete" : "upsert");
  }

  if (intent === "portfolio") {
    if (operation === "update_preferences") {
      return buildPortfolioDraft(normalizedInput, lines, "update_preferences");
    }

    return buildPortfolioDraft(
      normalizedInput,
      lines,
      operation === "delete" ? "delete" : "upsert",
    );
  }

  if (intent === "ticker") {
    return buildTickerDraft(normalizedInput, lines, operation === "delete" ? "delete" : "upsert");
  }

  if (intent === "theme") {
    return buildThemeDraft(normalizedInput, lines, operation === "delete" ? "delete" : "upsert");
  }

  if (intent === "followup") {
    return buildFollowUpDraft(normalizedInput, lines);
  }

  return {
    intent: "unknown",
    operation: "unknown",
    payload: {},
    missingFields: ["intent"],
    searchHints: [],
  };
}

export class ChangsebotClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ChangsebotClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const json = (await response.json()) as JsonResponse<T>;

    if (!response.ok) {
      throw new Error(json.error ?? "Changsebot client request failed.");
    }

    return json;
  }

  async search(scope: SearchScope, query: string) {
    return this.request<{
      scope: SearchScope;
      query: string;
      results: SearchResult[];
    }>("/api/internal/search", {
      method: "POST",
      body: JSON.stringify({ scope, query }),
    });
  }

  async findOne(scope: SearchScope, query: string) {
    const response = await this.search(scope, query);
    return response.results[0] ?? null;
  }

  async summary() {
    return this.request<{ counts: DatasetSummary }>("/api/internal/dataset/summary", {
      method: "GET",
    });
  }

  async upsertNews(payload: NewsPayload & { id?: string }) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/news", {
      method: "POST",
      body: JSON.stringify({
        operation: "upsert",
        ...payload,
      }),
    });
  }

  async deleteNews(id: string) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/news", {
      method: "POST",
      body: JSON.stringify({
        operation: "delete",
        id,
      }),
    });
  }

  async upsertPortfolioItem(payload: PortfolioItemPayload & { id?: string }) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/portfolio", {
      method: "POST",
      body: JSON.stringify({
        operation: "upsert_item",
        ...payload,
      }),
    });
  }

  async deletePortfolioItem(id: string) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/portfolio", {
      method: "POST",
      body: JSON.stringify({
        operation: "delete_item",
        id,
      }),
    });
  }

  async updatePortfolioPreferences(preferences: PortfolioPreferencesPayload) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/portfolio", {
      method: "POST",
      body: JSON.stringify({
        operation: "update_preferences",
        preferences,
      }),
    });
  }

  async upsertTicker(payload: TickerPayload & { id?: string }) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/tickers", {
      method: "POST",
      body: JSON.stringify({
        operation: "upsert",
        ...payload,
      }),
    });
  }

  async deleteTicker(id: string) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/tickers", {
      method: "POST",
      body: JSON.stringify({
        operation: "delete",
        id,
      }),
    });
  }

  async upsertTheme(payload: ThemePayload & { id?: string }) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/themes", {
      method: "POST",
      body: JSON.stringify({
        operation: "upsert",
        ...payload,
      }),
    });
  }

  async deleteTheme(id: string) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/themes", {
      method: "POST",
      body: JSON.stringify({
        operation: "delete",
        id,
      }),
    });
  }

  async updateFollowUp(payload: FollowUpPayload) {
    return this.request<{ dataset: unknown }>("/api/internal/ingest/follow-ups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export function createChangsebotClient(config: ChangsebotClientConfig) {
  return new ChangsebotClient(config);
}
