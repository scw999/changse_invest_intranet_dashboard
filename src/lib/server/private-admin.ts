import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AssetClass,
  ContentType,
  DirectionalView,
  FollowUpStatus,
  ImportanceLevel,
  NewsSortOption,
  PortfolioAssetType,
  PriorityLevel,
  Region,
  ScanSlot,
  ThemeCategory,
} from "@/types/research";

type OwnerRow = { owner_id: string };
type IdRow = { id: string };
type ThemeLookupRow = { id: string; name: string; slug: string };
type TickerLookupRow = { id: string; symbol: string; name: string };

export type NewsMutationInput = {
  contentType?: ContentType;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scanSlot: ScanSlot;
  region: Region;
  affectedAssetClasses: AssetClass[];
  relatedThemeIds: string[];
  relatedTickerIds: string[];
  marketInterpretation: string;
  directionalView: DirectionalView;
  actionIdea: string;
  followUpStatus: FollowUpStatus;
  followUpNote: string;
  importance: ImportanceLevel;
  monitoring?: {
    targetTickers?: string[];
    note?: string;
    referencePrice?: string;
    currentSnapshot?: string;
    triggerCondition?: string;
    nextCheckNote?: string;
  };
};

export type ThemeMutationInput = {
  id?: string;
  name: string;
  description: string;
  category: ThemeCategory;
  priority: PriorityLevel;
  color: string;
};

export type FollowUpMutationInput = {
  newsItemId: string;
  status: FollowUpStatus;
  resultNote: string;
};

export type PortfolioItemMutationInput = {
  id?: string;
  symbol: string;
  assetName: string;
  assetType: PortfolioAssetType;
  region: Region;
  isHolding: boolean;
  isWatchlist: boolean;
  weight?: number;
  averageCost?: number;
  memo?: string;
  priority: PriorityLevel;
};

export type PreferencesMutationInput = {
  timezone?: string;
  preferredSort?: NewsSortOption;
  favoriteSlots?: ScanSlot[];
  defaultRegions?: Region[];
  interestThemeIds?: string[];
  compactMode?: boolean;
};

export type TickerMutationInput = {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  region: Region;
  assetClass: AssetClass;
  note: string;
};

const OWNER_LOOKUP_TABLES = [
  "user_preferences",
  "themes",
  "tickers",
  "news_items",
  "portfolio_items",
] as const;

export async function resolveResearchOwnerId(client: SupabaseClient, fallbackOwnerId: string) {
  for (const table of OWNER_LOOKUP_TABLES) {
    const { data, error } = await client.from(table).select("owner_id").limit(1);

    if (error) {
      continue;
    }

    const ownerId = (data as OwnerRow[] | null)?.[0]?.owner_id;
    if (ownerId) {
      return ownerId;
    }
  }

  return fallbackOwnerId;
}

export function ensureMutationSuccess(
  error: { message: string } | null,
  fallbackMessage: string,
) {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

export function slugifyThemeName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "").replace(/\./g, "");
}

export function buildFollowUpCopy(status: FollowUpStatus, resultNote: string) {
  const trimmedNote = resultNote.trim();

  return {
    resolved_at: status === "Pending" ? null : new Date().toISOString(),
    outcome_summary:
      status === "Pending"
        ? "후속 점검 대기 상태입니다."
        : "관리자 또는 내부 보조 시스템이 후속 결과를 저장했습니다.",
    result_note: trimmedNote || "기본 후속 메모가 저장되었습니다.",
    market_impact:
      status === "Pending" ? "시장 영향은 추가 확인이 필요합니다." : "시장 영향 점검을 완료했습니다.",
  };
}

export function toPortfolioRow(payload: PortfolioItemMutationInput) {
  return {
    symbol: payload.symbol.trim().toUpperCase(),
    asset_name: payload.assetName.trim(),
    asset_type: payload.assetType,
    region: payload.region,
    is_holding: payload.isHolding,
    is_watchlist: payload.isWatchlist,
    weight: typeof payload.weight === "number" ? payload.weight : null,
    average_cost: typeof payload.averageCost === "number" ? payload.averageCost : null,
    memo: payload.memo?.trim() || null,
    priority: payload.priority,
  };
}

export function toTickerRow(payload: TickerMutationInput) {
  return {
    symbol: payload.symbol.trim().toUpperCase(),
    name: payload.name.trim(),
    exchange: payload.exchange.trim(),
    region: payload.region,
    asset_class: payload.assetClass,
    note: payload.note.trim(),
  };
}

export function formatEntityRef(id: string) {
  return id.length <= 12 ? id : id.slice(-8);
}

export async function resolveEntityId(
  client: SupabaseClient,
  table: "news_items" | "portfolio_items" | "tickers" | "themes",
  ownerId: string,
  rawIdOrRef: string,
) {
  const idOrRef = rawIdOrRef.trim();
  if (!idOrRef) {
    throw new Error("A target id or ref is required.");
  }

  const { data, error } = await client.from(table).select("id").eq("owner_id", ownerId);
  ensureMutationSuccess(error, `Failed to load ${table} ids.`);

  const rows = (data ?? []) as IdRow[];
  const exact = rows.find((row) => row.id === idOrRef);
  if (exact) {
    return exact.id;
  }

  const suffixMatches = rows.filter((row) => row.id.endsWith(idOrRef));
  if (suffixMatches.length === 1) {
    return suffixMatches[0].id;
  }

  if (suffixMatches.length > 1) {
    throw new Error(`Multiple ${table} rows matched ref ${idOrRef}. Use a longer id.`);
  }

  throw new Error(`No ${table} row matched ref ${idOrRef}.`);
}

export async function resolveThemeIds(
  client: SupabaseClient,
  ownerId: string,
  values: string[],
) {
  if (values.length === 0) {
    return [];
  }

  const { data, error } = await client.from("themes").select("id, name, slug").eq("owner_id", ownerId);
  ensureMutationSuccess(error, "Failed to load themes.");

  const rows = (data ?? []) as ThemeLookupRow[];

  return values.map((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("Theme references cannot be empty.");
    }

    const exact = rows.find((row) => row.id === trimmed || row.id.endsWith(trimmed));
    if (exact) {
      return exact.id;
    }

    const lookupKey = normalizeLookupKey(trimmed);
    const lookupSlug = slugifyThemeName(trimmed);
    const match = rows.find(
      (row) =>
        normalizeLookupKey(row.name) === lookupKey ||
        normalizeLookupKey(row.slug) === lookupKey ||
        row.slug === lookupSlug,
    );

    if (!match) {
      throw new Error(`No theme matched "${trimmed}".`);
    }

    return match.id;
  });
}

export async function resolveTickerIds(
  client: SupabaseClient,
  ownerId: string,
  values: string[],
) {
  if (values.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("tickers")
    .select("id, symbol, name")
    .eq("owner_id", ownerId);
  ensureMutationSuccess(error, "Failed to load tickers.");

  const rows = (data ?? []) as TickerLookupRow[];

  return values.map((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("Ticker references cannot be empty.");
    }

    const upper = trimmed.toUpperCase();
    const exact = rows.find(
      (row) => row.id === trimmed || row.id.endsWith(trimmed) || row.symbol.toUpperCase() === upper,
    );
    if (exact) {
      return exact.id;
    }

    const lookupKey = normalizeLookupKey(trimmed);
    const match = rows.find((row) => normalizeLookupKey(row.name) === lookupKey);
    if (!match) {
      throw new Error(`No ticker matched "${trimmed}".`);
    }

    return match.id;
  });
}

export async function upsertPortfolioItem(
  client: SupabaseClient,
  ownerId: string,
  payload: PortfolioItemMutationInput,
) {
  const row = {
    owner_id: ownerId,
    ...toPortfolioRow(payload),
  };

  if (payload.id) {
    const { error } = await client
      .from("portfolio_items")
      .update(row)
      .eq("owner_id", ownerId)
      .eq("id", payload.id);
    ensureMutationSuccess(error, "Failed to update portfolio item.");
    return;
  }

  const { error } = await client.from("portfolio_items").insert(row);
  ensureMutationSuccess(error, "Failed to create portfolio item.");
}

export async function deletePortfolioItem(
  client: SupabaseClient,
  ownerId: string,
  portfolioItemId: string,
) {
  const { error } = await client
    .from("portfolio_items")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", portfolioItemId);
  ensureMutationSuccess(error, "Failed to delete portfolio item.");
}

export async function updateUserPreferences(
  client: SupabaseClient,
  ownerId: string,
  payload: PreferencesMutationInput,
) {
  const nextPreferenceRow = {
    owner_id: ownerId,
    timezone: payload.timezone ?? "Asia/Seoul",
    preferred_sort: payload.preferredSort ?? "importance",
    favorite_slots: payload.favoriteSlots ?? ["09", "18"],
    default_regions: payload.defaultRegions ?? ["KR", "US"],
    compact_mode: payload.compactMode ?? false,
  };

  const { error: preferenceError } = await client
    .from("user_preferences")
    .upsert(nextPreferenceRow, { onConflict: "owner_id" });
  ensureMutationSuccess(preferenceError, "Failed to update user preferences.");

  if (payload.interestThemeIds) {
    const { error: deleteError } = await client
      .from("user_theme_interests")
      .delete()
      .eq("owner_id", ownerId);
    ensureMutationSuccess(deleteError, "Failed to reset theme interests.");

    if (payload.interestThemeIds.length > 0) {
      const { error: insertError } = await client.from("user_theme_interests").insert(
        payload.interestThemeIds.map((themeId) => ({
          owner_id: ownerId,
          theme_id: themeId,
          priority: "Medium",
        })),
      );
      ensureMutationSuccess(insertError, "Failed to save theme interests.");
    }
  }
}

export async function upsertTicker(
  client: SupabaseClient,
  ownerId: string,
  payload: TickerMutationInput,
) {
  const row = {
    owner_id: ownerId,
    ...toTickerRow(payload),
  };

  if (payload.id) {
    const { error } = await client
      .from("tickers")
      .update(row)
      .eq("owner_id", ownerId)
      .eq("id", payload.id);
    ensureMutationSuccess(error, "Failed to update ticker.");
    return;
  }

  const { error } = await client.from("tickers").insert(row);
  ensureMutationSuccess(error, "Failed to create ticker.");
}

export async function deleteTicker(client: SupabaseClient, ownerId: string, tickerId: string) {
  const { error } = await client
    .from("tickers")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", tickerId);
  ensureMutationSuccess(error, "Failed to delete ticker.");
}

export async function upsertTheme(
  client: SupabaseClient,
  ownerId: string,
  payload: ThemeMutationInput,
) {
  const row = {
    owner_id: ownerId,
    slug: slugifyThemeName(payload.name),
    name: payload.name.trim(),
    description: payload.description.trim(),
    category: payload.category,
    priority: payload.priority,
    color: payload.color.trim(),
  };

  if (payload.id) {
    const { error } = await client
      .from("themes")
      .update(row)
      .eq("owner_id", ownerId)
      .eq("id", payload.id);
    ensureMutationSuccess(error, "Failed to update theme.");
    return;
  }

  const { error } = await client.from("themes").insert(row);
  ensureMutationSuccess(error, "Failed to create theme.");
}

export async function deleteTheme(client: SupabaseClient, ownerId: string, themeId: string) {
  const { error } = await client
    .from("themes")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", themeId);
  ensureMutationSuccess(error, "Failed to delete theme.");
}
