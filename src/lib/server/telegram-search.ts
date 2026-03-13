import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchResearchDataset } from "@/lib/supabase/research";
import { formatEntityRef } from "@/lib/server/private-admin";

export type SearchScope = "news" | "followup" | "portfolio" | "ticker" | "theme";

function includesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export async function searchResearchDataset(
  client: SupabaseClient,
  scope: SearchScope,
  query: string,
  contentType?: "news" | "analysis" | "opinion" | "monitoring",
) {
  const dataset = await fetchResearchDataset(client);
  const q = query.trim();

  if (!q) {
    return [];
  }

  if (scope === "news") {
    return dataset.newsItems
      .filter((item) => !contentType || (item.contentType ?? "news") === contentType)
      .filter((item) =>
        includesQuery(
          [
            item.contentType ?? "news",
            item.title,
            item.summary,
            item.marketInterpretation,
            item.actionIdea,
            item.sourceName,
            item.followUpNote,
            item.monitoring?.note ?? "",
            item.monitoring?.triggerCondition ?? "",
            item.monitoring?.nextCheckNote ?? "",
            ...(item.monitoring?.targetTickers ?? []),
          ].join(" "),
          q,
        ),
      )
      .slice(0, 8)
      .map((item) => ({
        ref: formatEntityRef(item.id),
        id: item.id,
        line: `[${item.contentType ?? "news"}:${formatEntityRef(item.id)}] ${item.scanSlot} ${item.region} ${item.title}`,
      }));
  }

  if (scope === "followup") {
    return dataset.followUps
      .map((record) => ({
        record,
        news: dataset.newsItems.find((item) => item.id === record.newsItemId),
      }))
      .filter(
        (entry) =>
          entry.news &&
          includesQuery(
            [
              entry.news.title,
              entry.record.resultNote,
              entry.record.outcomeSummary,
              entry.record.status,
            ].join(" "),
            q,
          ),
      )
      .slice(0, 8)
      .map((entry) => ({
        ref: formatEntityRef(entry.record.newsItemId),
        id: entry.record.newsItemId,
        line: `[followup:${formatEntityRef(entry.record.newsItemId)}] ${entry.record.status} ${entry.news?.title ?? ""}`,
      }));
  }

  if (scope === "portfolio") {
    return dataset.portfolioItems
      .filter((item) =>
        includesQuery([item.symbol, item.assetName, item.memo ?? "", item.priority].join(" "), q),
      )
      .slice(0, 8)
      .map((item) => ({
        ref: formatEntityRef(item.id),
        id: item.id,
        line: `[portfolio:${formatEntityRef(item.id)}] ${item.symbol} ${item.assetName}`,
      }));
  }

  if (scope === "ticker") {
    return dataset.tickers
      .filter((item) => includesQuery([item.symbol, item.name, item.note].join(" "), q))
      .slice(0, 8)
      .map((item) => ({
        ref: formatEntityRef(item.id),
        id: item.id,
        line: `[ticker:${formatEntityRef(item.id)}] ${item.symbol} ${item.name}`,
      }));
  }

  return dataset.themes
    .filter((item) => includesQuery([item.name, item.description, item.category].join(" "), q))
    .slice(0, 8)
    .map((item) => ({
      ref: formatEntityRef(item.id),
      id: item.id,
      line: `[theme:${formatEntityRef(item.id)}] ${item.name}`,
    }));
}

export async function getResearchDatasetSummary(client: SupabaseClient) {
  const dataset = await fetchResearchDataset(client);

  return {
    themes: dataset.themes.length,
    tickers: dataset.tickers.length,
    newsItems: dataset.newsItems.length,
    followUps: dataset.followUps.length,
    portfolioItems: dataset.portfolioItems.length,
  };
}

export function formatSearchResults(scope: SearchScope, query: string, lines: string[]) {
  if (lines.length === 0) {
    return `검색 결과가 없습니다. scope=${scope}, query=${query}`;
  }

  return [`검색 결과`, `scope: ${scope}`, `query: ${query}`, "", ...lines].join("\n");
}
