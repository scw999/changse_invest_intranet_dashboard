import { parseISO } from "date-fns";

import { getDisplayNewsItem } from "@/lib/content-kr";
import type {
  ContentType,
  FollowUpRecord,
  ImportanceLevel,
  NewsItem,
  NewsSortOption,
  PortfolioItem,
  Region,
  ResearchDataset,
  ScanSlot,
  Theme,
  Ticker,
  UserPreferences,
} from "@/types/research";
import { sortNewsItems, toDateKey } from "@/lib/utils";

export type NewsFilters = {
  search?: string;
  contentType?: ContentType | "all";
  date?: string;
  slot?: ScanSlot | "all";
  region?: Region | "all";
  themeId?: string | "all";
  tickerId?: string | "all";
  importance?: ImportanceLevel | "all";
  sort?: NewsSortOption;
};

export type ScoredNewsItem = NewsItem & {
  relevanceScore: number;
};

export function groupById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>;
}

export function groupBySymbol(items: Ticker[]) {
  return Object.fromEntries(items.map((item) => [item.symbol, item])) as Record<
    string,
    Ticker
  >;
}

export function getLatestNewsDate(newsItems: NewsItem[]) {
  return [...newsItems]
    .sort(
      (left, right) => parseISO(right.publishedAt).getTime() - parseISO(left.publishedAt).getTime(),
    )[0]
    ?.publishedAt;
}

export function getUniqueDateKeys(newsItems: NewsItem[]) {
  return Array.from(new Set(newsItems.map((item) => toDateKey(item.publishedAt)))).sort(
    (left, right) => right.localeCompare(left),
  );
}

export function filterNewsItems(newsItems: NewsItem[], filters: NewsFilters) {
  const filtered = newsItems.filter((item) => {
    const displayItem = getDisplayNewsItem(item);
    const contentType = item.contentType ?? "news";

    if (filters.contentType && filters.contentType !== "all" && contentType !== filters.contentType) {
      return false;
    }

    if (filters.date && filters.date !== "all" && toDateKey(item.publishedAt) !== filters.date) {
      return false;
    }

    if (filters.slot && filters.slot !== "all" && item.scanSlot !== filters.slot) {
      return false;
    }

    if (filters.region && filters.region !== "all" && item.region !== filters.region) {
      return false;
    }

    if (filters.themeId && filters.themeId !== "all" && !item.relatedThemeIds.includes(filters.themeId)) {
      return false;
    }

    if (
      filters.tickerId &&
      filters.tickerId !== "all" &&
      !item.relatedTickerIds.includes(filters.tickerId)
    ) {
      return false;
    }

    if (
      filters.importance &&
      filters.importance !== "all" &&
      item.importance !== filters.importance
    ) {
      return false;
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const haystack = [
        contentType,
        displayItem.title,
        displayItem.summary,
        displayItem.marketInterpretation,
        displayItem.actionIdea,
        displayItem.sourceName,
        item.monitoring?.note ?? "",
        item.monitoring?.triggerCondition ?? "",
        item.monitoring?.nextCheckNote ?? "",
        ...(item.monitoring?.targetTickers ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  return sortNewsItems(filtered, filters.sort ?? "latest");
}

export function getTodayNews(newsItems: NewsItem[]) {
  const latestDate = getLatestNewsDate(newsItems);
  if (!latestDate) {
    return [];
  }

  const dateKey = toDateKey(latestDate);
  return filterNewsItems(newsItems, { date: dateKey, sort: "importance" });
}

export function getContentTypeItems(newsItems: NewsItem[], contentType: ContentType) {
  return filterNewsItems(newsItems, { contentType, sort: "latest" });
}

export function getSlotBuckets(newsItems: NewsItem[]) {
  const slots: Array<ScanSlot> = ["09", "13", "18", "22"];

  return slots.map((slot) => ({
    slot,
    items: newsItems.filter((item) => item.scanSlot === slot),
  }));
}

export function getOutlookCalls(newsItems: NewsItem[]) {
  return newsItems.filter((item) => item.directionalView !== "Neutral");
}

export function scorePersonalRelevance(
  item: NewsItem,
  _portfolioItems: PortfolioItem[],
  preferences: UserPreferences,
) {
  const interestThemeIds = new Set(preferences.interestThemeIds);

  let score = 0;

  score += item.relatedThemeIds.filter((themeId) => interestThemeIds.has(themeId)).length * 2;

  if (preferences.defaultRegions.includes(item.region)) {
    score += 1;
  }

  return score;
}

export function getPersonalizedNews(
  newsItems: NewsItem[],
  tickers: Ticker[],
  portfolioItems: PortfolioItem[],
  preferences: UserPreferences,
) {
  const tickerIdToSymbol = Object.fromEntries(tickers.map((ticker) => [ticker.id, ticker.symbol]));

  return newsItems
    .map((item) => {
      let score = item.relatedTickerIds.reduce((total, tickerId) => {
        const symbol = tickerIdToSymbol[tickerId];
        const portfolioEntry = portfolioItems.find((entry) => entry.symbol === symbol);

        if (!portfolioEntry) {
          return total;
        }

        return total + (portfolioEntry.isHolding ? 5 : 3);
      }, scorePersonalRelevance(item, portfolioItems, preferences));

      if (item.importance === "Critical") {
        score += 2;
      }

      return {
        ...item,
        relevanceScore: score,
      };
    })
    .filter((item) => item.relevanceScore > 0)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return parseISO(right.publishedAt).getTime() - parseISO(left.publishedAt).getTime();
    });
}

export function getThemeCoverage(dataset: ResearchDataset, theme: Theme) {
  const relatedNews = dataset.newsItems.filter((item) => item.relatedThemeIds.includes(theme.id));
  const relatedFollowUps = dataset.followUps.filter((followUp) =>
    relatedNews.some((item) => item.id === followUp.newsItemId),
  );

  return {
    newsCount: relatedNews.length,
    pendingCount: relatedNews.filter((item) => item.followUpStatus === "Pending").length,
    followUpCount: relatedFollowUps.length,
    latestPublishedAt: relatedNews[0]?.publishedAt ?? null,
  };
}

export function getTickerCoverage(dataset: ResearchDataset, ticker: Ticker) {
  const relatedNews = dataset.newsItems.filter((item) => item.relatedTickerIds.includes(ticker.id));
  const relatedFollowUps = dataset.followUps.filter((followUp) =>
    relatedNews.some((item) => item.id === followUp.newsItemId),
  );

  return {
    newsCount: relatedNews.length,
    followUpCount: relatedFollowUps.length,
    outlookCount: relatedNews.filter((item) => item.directionalView !== "Neutral").length,
  };
}

export function getFollowUpSummary(followUps: FollowUpRecord[]) {
  return {
    total: followUps.length,
    pending: followUps.filter((item) => item.status === "Pending").length,
    correct: followUps.filter((item) => item.status === "Correct").length,
    wrong: followUps.filter((item) => item.status === "Wrong").length,
    mixed: followUps.filter((item) => item.status === "Mixed").length,
  };
}
