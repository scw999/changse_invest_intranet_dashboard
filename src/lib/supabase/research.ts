import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResearchDataset } from "@/types/research";

type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ResearchDataset["themes"][number]["category"];
  priority: ResearchDataset["themes"][number]["priority"];
  color: string;
};

type TickerRow = {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  region: ResearchDataset["tickers"][number]["region"];
  asset_class: ResearchDataset["tickers"][number]["assetClass"];
  note: string;
};

type NewsRow = {
  id: string;
  content_type: NonNullable<ResearchDataset["newsItems"][number]["contentType"]>;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  scan_slot: ResearchDataset["newsItems"][number]["scanSlot"];
  region: ResearchDataset["newsItems"][number]["region"];
  affected_asset_classes: ResearchDataset["newsItems"][number]["affectedAssetClasses"];
  market_interpretation: string;
  directional_view: ResearchDataset["newsItems"][number]["directionalView"];
  action_idea: string;
  follow_up_status: ResearchDataset["newsItems"][number]["followUpStatus"];
  follow_up_note: string;
  importance: ResearchDataset["newsItems"][number]["importance"];
  content_meta: { monitoring?: ResearchDataset["newsItems"][number]["monitoring"] } | null;
  created_at: string;
  updated_at: string;
};

type FollowUpRow = {
  id: string;
  news_item_id: string;
  status: ResearchDataset["followUps"][number]["status"];
  resolved_at: string | null;
  outcome_summary: string;
  result_note: string;
  market_impact: string;
};

type PortfolioRow = {
  id: string;
  symbol: string;
  asset_name: string;
  asset_type: ResearchDataset["portfolioItems"][number]["assetType"];
  region: ResearchDataset["portfolioItems"][number]["region"];
  is_holding: boolean;
  is_watchlist: boolean;
  weight: number | null;
  average_cost: number | null;
  memo: string | null;
  priority: ResearchDataset["portfolioItems"][number]["priority"];
};

type PreferenceRow = {
  owner_id: string;
  timezone: string;
  preferred_sort: ResearchDataset["preferences"]["preferredSort"];
  favorite_slots: ResearchDataset["preferences"]["favoriteSlots"];
  default_regions: ResearchDataset["preferences"]["defaultRegions"];
  compact_mode: boolean;
};

type InterestRow = {
  theme_id: string;
};

function ensureNoError(error: { message: string; code?: string } | null, tableName: string) {
  if (!error) {
    return;
  }

  if (error.code === "PGRST205") {
    throw new Error(
      `Supabase project is missing the ${tableName} table. Apply schema.sql before using the private research API.`,
    );
  }

  throw new Error(error.message || `Failed to read ${tableName}.`);
}

export async function fetchResearchDataset(client: SupabaseClient): Promise<ResearchDataset> {
  const [
    themesResult,
    tickersResult,
    newsResult,
    newsThemesResult,
    newsTickersResult,
    followUpsResult,
    portfolioResult,
    preferencesResult,
    interestsResult,
  ] = await Promise.all([
    client.from("themes").select("id, slug, name, description, category, priority, color").order("name"),
    client
      .from("tickers")
      .select("id, symbol, name, exchange, region, asset_class, note")
      .order("symbol"),
    client
      .from("news_items")
      .select(
        "id, content_type, title, summary, source_name, source_url, published_at, scan_slot, region, affected_asset_classes, market_interpretation, directional_view, action_idea, follow_up_status, follow_up_note, importance, content_meta, created_at, updated_at",
      )
      .order("published_at", { ascending: false }),
    client.from("news_item_themes").select("news_item_id, theme_id"),
    client.from("news_item_tickers").select("news_item_id, ticker_id"),
    client
      .from("follow_up_records")
      .select("id, news_item_id, status, resolved_at, outcome_summary, result_note, market_impact")
      .order("resolved_at", { ascending: false, nullsFirst: false }),
    client
      .from("portfolio_items")
      .select(
        "id, symbol, asset_name, asset_type, region, is_holding, is_watchlist, weight, average_cost, memo, priority",
      )
      .order("priority", { ascending: false }),
    client
      .from("user_preferences")
      .select("owner_id, timezone, preferred_sort, favorite_slots, default_regions, compact_mode")
      .maybeSingle(),
    client.from("user_theme_interests").select("theme_id"),
  ]);

  ensureNoError(themesResult.error, "themes");
  ensureNoError(tickersResult.error, "tickers");
  ensureNoError(newsResult.error, "news_items");
  ensureNoError(newsThemesResult.error, "news_item_themes");
  ensureNoError(newsTickersResult.error, "news_item_tickers");
  ensureNoError(followUpsResult.error, "follow_up_records");
  ensureNoError(portfolioResult.error, "portfolio_items");
  ensureNoError(preferencesResult.error, "user_preferences");
  ensureNoError(interestsResult.error, "user_theme_interests");

  const themeIdsByNews = new Map<string, string[]>();
  for (const row of (newsThemesResult.data ?? []) as Array<{ news_item_id: string; theme_id: string }>) {
    const next = themeIdsByNews.get(row.news_item_id) ?? [];
    next.push(row.theme_id);
    themeIdsByNews.set(row.news_item_id, next);
  }

  const tickerIdsByNews = new Map<string, string[]>();
  for (const row of (newsTickersResult.data ?? []) as Array<{ news_item_id: string; ticker_id: string }>) {
    const next = tickerIdsByNews.get(row.news_item_id) ?? [];
    next.push(row.ticker_id);
    tickerIdsByNews.set(row.news_item_id, next);
  }

  const preferences = (preferencesResult.data as PreferenceRow | null) ?? {
    owner_id: "preferences-local",
    timezone: "Asia/Seoul",
    preferred_sort: "importance",
    favorite_slots: ["09", "18"],
    default_regions: ["KR", "US"],
    compact_mode: false,
  };

  return {
    themes: ((themesResult.data ?? []) as ThemeRow[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      priority: row.priority,
      color: row.color,
    })),
    tickers: ((tickersResult.data ?? []) as TickerRow[]).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      region: row.region,
      assetClass: row.asset_class,
      note: row.note,
    })),
    newsItems: ((newsResult.data ?? []) as NewsRow[]).map((row) => ({
      id: row.id,
      contentType: row.content_type ?? "news",
      title: row.title,
      summary: row.summary,
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      publishedAt: row.published_at,
      scanSlot: row.scan_slot,
      region: row.region,
      affectedAssetClasses: row.affected_asset_classes ?? [],
      relatedThemeIds: themeIdsByNews.get(row.id) ?? [],
      relatedTickerIds: tickerIdsByNews.get(row.id) ?? [],
      marketInterpretation: row.market_interpretation,
      directionalView: row.directional_view,
      actionIdea: row.action_idea,
      followUpStatus: row.follow_up_status,
      followUpNote: row.follow_up_note,
      importance: row.importance,
      monitoring: row.content_meta?.monitoring,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    followUps: ((followUpsResult.data ?? []) as FollowUpRow[]).map((row) => ({
      id: row.id,
      newsItemId: row.news_item_id,
      status: row.status,
      resolvedAt: row.resolved_at,
      outcomeSummary: row.outcome_summary,
      resultNote: row.result_note,
      marketImpact: row.market_impact,
    })),
    portfolioItems: ((portfolioResult.data ?? []) as PortfolioRow[]).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      assetName: row.asset_name,
      assetType: row.asset_type,
      region: row.region,
      isHolding: row.is_holding,
      isWatchlist: row.is_watchlist,
      weight: row.weight ?? undefined,
      averageCost: row.average_cost ?? undefined,
      memo: row.memo ?? undefined,
      priority: row.priority,
    })),
    preferences: {
      id: preferences.owner_id,
      timezone: preferences.timezone,
      preferredSort: preferences.preferred_sort,
      favoriteSlots: preferences.favorite_slots,
      defaultRegions: preferences.default_regions,
      interestThemeIds: ((interestsResult.data ?? []) as InterestRow[]).map((row) => row.theme_id),
      compactMode: preferences.compact_mode,
    },
  };
}
