import type {
  AssetClass,
  NewsSortOption,
  PortfolioAssetType,
  PriorityLevel,
  Region,
  ScanSlot,
} from "@/types/research";

type NewsOperation = "upsert" | "delete";
type PortfolioOperation = "upsert_item" | "delete_item" | "update_preferences";
type TickerOperation = "upsert" | "delete";
type ThemeOperation = "upsert" | "delete";
type SearchScope = "news" | "followup" | "portfolio" | "ticker" | "theme";

export type ParsedTelegramCommand =
  | { kind: "help" }
  | { kind: "search"; scope: SearchScope; query: string }
  | { kind: "news"; payload: Record<string, unknown> & { operation: NewsOperation } }
  | { kind: "followup"; payload: Record<string, unknown> }
  | { kind: "portfolio"; payload: Record<string, unknown> & { operation: PortfolioOperation } }
  | { kind: "ticker"; payload: Record<string, unknown> & { operation: TickerOperation } }
  | { kind: "theme"; payload: Record<string, unknown> & { operation: ThemeOperation } };

type ParseResult =
  | { ok: true; command: ParsedTelegramCommand }
  | { ok: false; message: string };

function parseKeyValueBody(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const record: Record<string, string> = {};

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    record[key] = value;
  }

  return record;
}

function parseStructuredBody(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return parseKeyValueBody(trimmed);
}

function parseList(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value?: string) {
  if (!value) {
    return false;
  }

  return ["true", "1", "yes", "y", "on", "hold", "watch"].includes(value.trim().toLowerCase());
}

function parseOptionalNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSearchCommand(action: string, body: string): ParseResult {
  const scope = (action || "news") as SearchScope;
  const query = body.trim();

  if (!["news", "followup", "portfolio", "ticker", "theme"].includes(scope)) {
    return { ok: false, message: "search scope는 news, followup, portfolio, ticker, theme 중 하나여야 합니다." };
  }

  if (!query) {
    return { ok: false, message: "검색어가 비어 있습니다." };
  }

  return {
    ok: true,
    command: {
      kind: "search",
      scope,
      query,
    },
  };
}

function parseNewsPayload(operation: NewsOperation, body: string): ParseResult {
  const parsed = parseStructuredBody(body);

  if (!parsed) {
    return { ok: false, message: "뉴스 입력 형식이 올바르지 않습니다." };
  }

  if (operation === "delete") {
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (!id) {
      return { ok: false, message: "삭제할 뉴스 id 또는 ref가 필요합니다." };
    }

    return {
      ok: true,
      command: { kind: "news", payload: { operation: "delete", id } },
    };
  }

  const title = String(parsed.title ?? "").trim();
  const summary = String(parsed.summary ?? "").trim();
  const sourceName = String(parsed.source_name ?? parsed.source ?? "").trim();
  const sourceUrl = String(parsed.source_url ?? parsed.url ?? "").trim();
  const publishedAt = String(parsed.published_at ?? "").trim();

  if (!title || !summary || !sourceName || !sourceUrl || !publishedAt) {
    return {
      ok: false,
      message: "뉴스 등록에는 title, summary, source, url, published_at 값이 필요합니다.",
    };
  }

  return {
    ok: true,
    command: {
      kind: "news",
      payload: {
        operation: "upsert",
        ...(typeof parsed.id === "string" ? { id: parsed.id } : {}),
        title,
        summary,
        sourceName,
        sourceUrl,
        publishedAt,
        scanSlot: String(parsed.slot ?? parsed.scan_slot ?? "09") as ScanSlot,
        region: String(parsed.region ?? "KR") as Region,
        affectedAssetClasses: parseList(
          String(parsed.asset_classes ?? parsed.affected_asset_classes ?? ""),
        ) as AssetClass[],
        relatedThemeIds: parseList(String(parsed.theme_ids ?? parsed.related_theme_ids ?? "")),
        relatedTickerIds: parseList(String(parsed.ticker_ids ?? parsed.related_ticker_ids ?? "")),
        marketInterpretation: String(
          parsed.interpretation ?? parsed.market_interpretation ?? "",
        ).trim(),
        directionalView: String(parsed.view ?? parsed.directional_view ?? "Neutral"),
        actionIdea: String(parsed.action ?? parsed.action_idea ?? "").trim(),
        followUpStatus: String(parsed.follow_up_status ?? "Pending"),
        followUpNote: String(parsed.follow_up_note ?? "").trim(),
        importance: String(parsed.importance ?? "Medium"),
      },
    },
  };
}

function parseFollowUpPayload(body: string): ParseResult {
  const parsed = parseStructuredBody(body);

  if (!parsed) {
    return { ok: false, message: "팔로업 입력 형식이 올바르지 않습니다." };
  }

  const newsItemId = String(parsed.news_item_id ?? parsed.id ?? "").trim();
  const status = String(parsed.status ?? "").trim();
  const resultNote = String(parsed.note ?? parsed.result_note ?? "").trim();

  if (!newsItemId || !status) {
    return { ok: false, message: "팔로업 저장에는 news_item_id 와 status 값이 필요합니다." };
  }

  return {
    ok: true,
    command: {
      kind: "followup",
      payload: { newsItemId, status, resultNote },
    },
  };
}

function parsePortfolioPayload(operation: PortfolioOperation, body: string): ParseResult {
  const parsed = parseStructuredBody(body);

  if (!parsed) {
    return { ok: false, message: "포트폴리오 입력 형식이 올바르지 않습니다." };
  }

  if (operation === "delete_item") {
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (!id) {
      return { ok: false, message: "삭제할 포트폴리오 item id 또는 ref가 필요합니다." };
    }

    return {
      ok: true,
      command: { kind: "portfolio", payload: { operation, id } },
    };
  }

  if (operation === "update_preferences") {
    return {
      ok: true,
      command: {
        kind: "portfolio",
        payload: {
          operation,
          preferences: {
            timezone: typeof parsed.timezone === "string" ? parsed.timezone : undefined,
            preferredSort:
              typeof parsed.preferred_sort === "string"
                ? (parsed.preferred_sort as NewsSortOption)
                : undefined,
            favoriteSlots: parseList(String(parsed.favorite_slots ?? "")) as ScanSlot[],
            defaultRegions: parseList(String(parsed.default_regions ?? "")) as Region[],
            interestThemeIds: parseList(String(parsed.interest_theme_ids ?? "")),
            compactMode:
              typeof parsed.compact_mode === "string"
                ? parseBoolean(parsed.compact_mode)
                : undefined,
          },
        },
      },
    };
  }

  const symbol = String(parsed.symbol ?? "").trim();
  const assetName = String(parsed.asset_name ?? parsed.name ?? "").trim();

  if (!symbol || !assetName) {
    return { ok: false, message: "포트폴리오 저장에는 symbol, asset_name 값이 필요합니다." };
  }

  return {
    ok: true,
    command: {
      kind: "portfolio",
      payload: {
        operation,
        ...(typeof parsed.id === "string" ? { id: parsed.id } : {}),
        symbol,
        assetName,
        assetType: String(parsed.asset_type ?? "Stock") as PortfolioAssetType,
        region: String(parsed.region ?? "KR") as Region,
        isHolding: parseBoolean(String(parsed.holding ?? parsed.is_holding ?? "false")),
        isWatchlist: parseBoolean(String(parsed.watchlist ?? parsed.is_watchlist ?? "true")),
        weight: parseOptionalNumber(String(parsed.weight ?? "")),
        averageCost: parseOptionalNumber(String(parsed.average_cost ?? parsed.avg_cost ?? "")),
        memo: String(parsed.memo ?? "").trim(),
        priority: String(parsed.priority ?? "Medium") as PriorityLevel,
      },
    },
  };
}

function parseTickerPayload(operation: TickerOperation, body: string): ParseResult {
  const parsed = parseStructuredBody(body);

  if (!parsed) {
    return { ok: false, message: "티커 입력 형식이 올바르지 않습니다." };
  }

  if (operation === "delete") {
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (!id) {
      return { ok: false, message: "삭제할 티커 id 또는 ref가 필요합니다." };
    }

    return {
      ok: true,
      command: { kind: "ticker", payload: { operation, id } },
    };
  }

  const symbol = String(parsed.symbol ?? "").trim();
  const name = String(parsed.name ?? "").trim();

  if (!symbol || !name) {
    return { ok: false, message: "티커 저장에는 symbol, name 값이 필요합니다." };
  }

  return {
    ok: true,
    command: {
      kind: "ticker",
      payload: {
        operation,
        ...(typeof parsed.id === "string" ? { id: parsed.id } : {}),
        symbol,
        name,
        exchange: String(parsed.exchange ?? "").trim(),
        region: String(parsed.region ?? "KR") as Region,
        assetClass: String(parsed.asset_class ?? "Equities") as AssetClass,
        note: String(parsed.note ?? "").trim(),
      },
    },
  };
}

function parseThemePayload(operation: ThemeOperation, body: string): ParseResult {
  const parsed = parseStructuredBody(body);

  if (!parsed) {
    return { ok: false, message: "테마 입력 형식이 올바르지 않습니다." };
  }

  if (operation === "delete") {
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (!id) {
      return { ok: false, message: "삭제할 테마 id 또는 ref가 필요합니다." };
    }

    return {
      ok: true,
      command: { kind: "theme", payload: { operation, id } },
    };
  }

  const name = String(parsed.name ?? "").trim();
  const description = String(parsed.description ?? "").trim();

  if (!name || !description) {
    return { ok: false, message: "테마 저장에는 name, description 값이 필요합니다." };
  }

  return {
    ok: true,
    command: {
      kind: "theme",
      payload: {
        operation,
        ...(typeof parsed.id === "string" ? { id: parsed.id } : {}),
        name,
        description,
        category: String(parsed.category ?? "Macro"),
        priority: String(parsed.priority ?? "Medium"),
        color: String(parsed.color ?? "#355c7d"),
      },
    },
  };
}

export function parseTelegramCommand(text: string): ParseResult {
  const trimmed = text.trim();

  if (!trimmed) {
    return { ok: false, message: "명령이 비어 있습니다." };
  }

  const lines = trimmed.split(/\r?\n/);
  const [firstLine, ...rest] = lines;
  const [rawCommand, rawAction, ...queryParts] = firstLine.trim().split(/\s+/);
  const command = rawCommand.replace(/^\/+/, "").toLowerCase();
  const action = (rawAction ?? "").toLowerCase();
  const body = rest.join("\n");

  if (command === "help" || command === "start") {
    return { ok: true, command: { kind: "help" } };
  }

  if (command === "search") {
    const inlineQuery = queryParts.join(" ");
    return parseSearchCommand(action, inlineQuery || body);
  }

  if (command === "news" || command === "idea") {
    return parseNewsPayload(action === "delete" ? "delete" : "upsert", body);
  }

  if (command === "followup" || command === "follow") {
    return parseFollowUpPayload(body);
  }

  if (command === "portfolio" || command === "watchlist") {
    const operation: PortfolioOperation =
      action === "delete"
        ? "delete_item"
        : action === "prefs" || action === "preferences"
          ? "update_preferences"
          : "upsert_item";
    return parsePortfolioPayload(operation, body);
  }

  if (command === "ticker" || command === "tickers") {
    return parseTickerPayload(action === "delete" ? "delete" : "upsert", body);
  }

  if (command === "theme" || command === "themes") {
    return parseThemePayload(action === "delete" ? "delete" : "upsert", body);
  }

  return {
    ok: false,
    message:
      "지원하는 명령은 /search, /news, /idea, /followup, /portfolio, /watchlist, /ticker, /theme, /help 입니다.",
  };
}

export function getTelegramHelpText() {
  return [
    "창세봇 명령 형식",
    "",
    "0) 검색",
    "/search news 삼성전자",
    "/search followup 반도체",
    "/search portfolio NVDA",
    "/search ticker 반도체",
    "/search theme AI",
    "",
    "1) 뉴스 / 투자 아이디어 등록",
    "/news",
    "title: 한국 반도체 수출 개선",
    "summary: 조기 수출 지표가 개선됐다.",
    "source: 연합",
    "url: https://example.com/news",
    "published_at: 2026-03-13T09:00:00+09:00",
    "slot: 09",
    "region: KR",
    "asset_classes: Equities",
    "theme_ids: theme-semi-cycle",
    "ticker_ids: ticker-005930-ks,ticker-000660-ks",
    "interpretation: 반도체 수출 회복 기대 강화",
    "view: Bullish",
    "action: 삼성전자와 SK하이닉스 비중 유지",
    "follow_up_note: 다음 주 가격 데이터 확인 필요",
    "importance: High",
    "",
    "2) 팔로업 업데이트",
    "/followup",
    "news_item_id: news-001 또는 검색 결과 ref",
    "status: Correct",
    "note: 오전 해석대로 반도체 강세가 이어짐",
    "",
    "3) 포트폴리오 / 관심종목 저장",
    "/portfolio",
    "symbol: NVDA",
    "asset_name: NVIDIA",
    "asset_type: Stock",
    "region: US",
    "holding: false",
    "watchlist: true",
    "priority: High",
    "memo: AI 공급망 핵심 티커",
    "",
    "4) 티커 저장",
    "/ticker",
    "symbol: SOXL",
    "name: Direxion Daily Semiconductor Bull 3X Shares",
    "exchange: NYSE Arca",
    "region: US",
    "asset_class: ETF",
    "note: 반도체 레버리지 ETF",
    "",
    "5) 테마 저장",
    "/theme",
    "name: AI 인프라",
    "description: AI capex와 공급망 모니터링 테마",
    "category: Sector",
    "priority: High",
    "color: #355c7d",
  ].join("\n");
}
