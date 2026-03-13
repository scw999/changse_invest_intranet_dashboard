"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageIntro } from "@/components/layout/page-intro";
import { NewsCard } from "@/components/research/news-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayTheme } from "@/lib/content-kr";
import { buildArchiveHref } from "@/lib/navigation";
import {
  contentTypeLabels,
  importanceLabels,
  newsSortLabels,
  regionLabels,
} from "@/lib/localize";
import {
  filterNewsItems,
  getLatestNewsDate,
  getUniqueDateKeys,
  groupById,
} from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { formatCalendarDate, toDateKey } from "@/lib/utils";
import {
  CONTENT_TYPES,
  IMPORTANCE_LEVELS,
  NEWS_SORT_OPTIONS,
  REGIONS,
  SCAN_SLOTS,
  type ContentType,
  type Theme,
  type Ticker,
} from "@/types/research";

function resolveThemeId(rawValue: string | null, themes: Theme[]) {
  if (!rawValue || rawValue === "all") {
    return "all";
  }

  const lowered = rawValue.toLowerCase();
  const match = themes.find((theme) => {
    const displayTheme = getDisplayTheme(theme);
    return (
      theme.id.toLowerCase() === lowered ||
      theme.slug.toLowerCase() === lowered ||
      displayTheme.name.toLowerCase() === lowered
    );
  });

  return match?.id ?? "all";
}

function resolveTickerId(rawValue: string | null, tickers: Ticker[]) {
  if (!rawValue || rawValue === "all") {
    return "all";
  }

  const lowered = rawValue.toLowerCase();
  const match = tickers.find((ticker) => {
    return ticker.id.toLowerCase() === lowered || ticker.symbol.toLowerCase() === lowered;
  });

  return match?.id ?? "all";
}

function resolveContentType(rawValue: string | null) {
  if (!rawValue || rawValue === "all") {
    return "all";
  }

  return CONTENT_TYPES.includes(rawValue as ContentType) ? (rawValue as ContentType) : "all";
}

export function ArchivePage() {
  const dataset = useResearchStore((state) => state);
  const themeMap = groupById(dataset.themes);
  const tickerMap = groupById(dataset.tickers);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const latestDate = getLatestNewsDate(dataset.newsItems);
  const todayKey = latestDate ? toDateKey(latestDate) : "all";

  const derivedState = useMemo<{
    search: string;
    contentType: ContentType | "all";
    date: string;
    slot: "all" | (typeof SCAN_SLOTS)[number];
    region: "all" | (typeof REGIONS)[number];
    themeId: string;
    tickerId: string;
    importance: "all" | (typeof IMPORTANCE_LEVELS)[number];
    sort: (typeof NEWS_SORT_OPTIONS)[number];
    linked: string;
  }>(() => {
    const rawDate = searchParams.get("date");
    const rawImportance = searchParams.get("priority") ?? searchParams.get("importance");

    return {
      search: searchParams.get("q") ?? "",
      contentType: resolveContentType(searchParams.get("type")),
      date: rawDate === "today" ? todayKey : rawDate ?? "all",
      slot: (searchParams.get("slot") as "all" | (typeof SCAN_SLOTS)[number] | null) ?? "all",
      region: (searchParams.get("region") as "all" | (typeof REGIONS)[number] | null) ?? "all",
      themeId: resolveThemeId(searchParams.get("theme"), dataset.themes),
      tickerId: resolveTickerId(searchParams.get("ticker"), dataset.tickers),
      importance:
        (rawImportance as "all" | (typeof IMPORTANCE_LEVELS)[number] | null) ?? "all",
      sort:
        (searchParams.get("sort") as (typeof NEWS_SORT_OPTIONS)[number] | null) ??
        dataset.preferences.preferredSort,
      linked: searchParams.get("linked") ?? "all",
    };
  }, [dataset.preferences.preferredSort, dataset.themes, dataset.tickers, searchParams, todayKey]);

  const [search, setSearch] = useState(derivedState.search);
  const [contentType, setContentType] = useState<ContentType | "all">(derivedState.contentType);
  const [date, setDate] = useState(derivedState.date);
  const [slot, setSlot] = useState<"all" | (typeof SCAN_SLOTS)[number]>(derivedState.slot);
  const [region, setRegion] = useState<"all" | (typeof REGIONS)[number]>(derivedState.region);
  const [themeId, setThemeId] = useState(derivedState.themeId);
  const [tickerId, setTickerId] = useState(derivedState.tickerId);
  const [importance, setImportance] = useState<"all" | (typeof IMPORTANCE_LEVELS)[number]>(
    derivedState.importance,
  );
  const [sort, setSort] = useState<(typeof NEWS_SORT_OPTIONS)[number]>(derivedState.sort);

  useEffect(() => {
    setSearch(derivedState.search);
    setContentType(derivedState.contentType);
    setDate(derivedState.date);
    setSlot(derivedState.slot);
    setRegion(derivedState.region);
    setThemeId(derivedState.themeId);
    setTickerId(derivedState.tickerId);
    setImportance(derivedState.importance);
    setSort(derivedState.sort);
  }, [derivedState]);

  const updateQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const linkedTickerIds = new Set(
    dataset.portfolioItems
      .filter((item) => item.isHolding || item.isWatchlist)
      .map((item) => dataset.tickers.find((ticker) => ticker.symbol === item.symbol)?.id)
      .filter((value): value is string => Boolean(value)),
  );
  const linkedThemeIds = new Set(dataset.preferences.interestThemeIds);

  const filteredItems = filterNewsItems(dataset.newsItems, {
    search,
    contentType,
    date,
    slot,
    region,
    themeId,
    tickerId,
    importance,
    sort,
  }).filter((item) => {
    if (derivedState.linked !== "portfolio") {
      return true;
    }

    return (
      item.relatedTickerIds.some((entry) => linkedTickerIds.has(entry)) ||
      item.relatedThemeIds.some((entry) => linkedThemeIds.has(entry))
    );
  });

  const resetFilters = () => {
    setSearch("");
    setContentType("all");
    setDate("all");
    setSlot("all");
    setRegion("all");
    setThemeId("all");
    setTickerId("all");
    setImportance("all");
    setSort(dataset.preferences.preferredSort);
    updateQuery({
      q: "",
      type: "",
      date: "",
      slot: "",
      region: "",
      theme: "",
      ticker: "",
      priority: "",
      sort: "",
      linked: "",
    });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Archive"
        title="뉴스, 분석, 투자 의견, 모니터링을 한 흐름에서 탐색"
        description="기록 성격이 다른 콘텐츠를 같은 검색 흐름 안에서 보되, 타입 필터로 빠르게 좁혀서 읽을 수 있도록 정리했습니다."
        meta={`총 ${dataset.newsItems.length}건 보관`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">타입 필터</Badge>
          <Badge variant="outline">URL 기반 탐색</Badge>
          <Badge variant="outline">상세 읽기 분리</Badge>
        </div>
      </PageIntro>

      <FilterToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateQuery({ q: value });
        }}
        onReset={resetFilters}
        filters={[
          {
            label: "타입",
            value: contentType,
            onChange: (value) => {
              setContentType(value as ContentType | "all");
              updateQuery({ type: value });
            },
            options: [
              { label: "전체 타입", value: "all" },
              ...CONTENT_TYPES.map((entry) => ({
                label: contentTypeLabels[entry],
                value: entry,
              })),
            ],
          },
          {
            label: "날짜",
            value: date,
            onChange: (value) => {
              setDate(value);
              updateQuery({ date: value === todayKey ? "today" : value });
            },
            options: [
              { label: "전체 날짜", value: "all" },
              ...(todayKey !== "all" ? [{ label: "오늘", value: todayKey }] : []),
              ...getUniqueDateKeys(dataset.newsItems).map((dateKey) => ({
                label: formatCalendarDate(`${dateKey}T00:00:00+09:00`),
                value: dateKey,
              })),
            ],
          },
          {
            label: "슬롯",
            value: slot,
            onChange: (value) => {
              setSlot(value as typeof slot);
              updateQuery({ slot: value });
            },
            options: [
              { label: "전체 슬롯", value: "all" },
              ...SCAN_SLOTS.map((entry) => ({ label: `${entry}:00`, value: entry })),
            ],
          },
          {
            label: "지역",
            value: region,
            onChange: (value) => {
              setRegion(value as typeof region);
              updateQuery({ region: value });
            },
            options: [
              { label: "전체 지역", value: "all" },
              ...REGIONS.map((entry) => ({ label: regionLabels[entry], value: entry })),
            ],
          },
          {
            label: "테마",
            value: themeId,
            onChange: (value) => {
              setThemeId(value);
              const theme = dataset.themes.find((entry) => entry.id === value);
              updateQuery({ theme: theme?.slug ?? value });
            },
            options: [
              { label: "전체 테마", value: "all" },
              ...dataset.themes.map((theme) => ({
                label: getDisplayTheme(theme).name,
                value: theme.id,
              })),
            ],
          },
          {
            label: "티커",
            value: tickerId,
            onChange: (value) => {
              setTickerId(value);
              const ticker = dataset.tickers.find((entry) => entry.id === value);
              updateQuery({ ticker: ticker?.symbol ?? value });
            },
            options: [
              { label: "전체 티커", value: "all" },
              ...dataset.tickers.map((ticker) => ({ label: ticker.symbol, value: ticker.id })),
            ],
          },
          {
            label: "중요도",
            value: importance,
            onChange: (value) => {
              setImportance(value as typeof importance);
              updateQuery({ priority: value });
            },
            options: [
              { label: "전체 중요도", value: "all" },
              ...IMPORTANCE_LEVELS.map((entry) => ({
                label: importanceLabels[entry],
                value: entry,
              })),
            ],
          },
          {
            label: "정렬",
            value: sort,
            onChange: (value) => {
              setSort(value as typeof sort);
              updateQuery({ sort: value });
            },
            options: NEWS_SORT_OPTIONS.map((entry) => ({
              label: newsSortLabels[entry],
              value: entry,
            })),
          },
        ]}
      />

      <SectionCard
        title="아카이브 결과"
        description={`현재 조건으로 ${filteredItems.length}건이 검색되었습니다.`}
        action={
          derivedState.linked === "portfolio" ? (
            <Link
              href={buildArchiveHref({ linked: "portfolio", date: "today" })}
              className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
            >
              보유 연관만 보기
            </Link>
          ) : null
        }
      >
        <div className="space-y-5">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                themeNames={item.relatedThemeIds.map(
                  (entry) => (themeMap[entry] ? getDisplayTheme(themeMap[entry]).name : entry),
                )}
                tickerSymbols={item.relatedTickerIds.map(
                  (entry) => tickerMap[entry]?.symbol ?? entry,
                )}
              />
            ))
          ) : (
            <EmptyState
              title="조건에 맞는 기록이 없습니다"
              description="타입이나 날짜, 검색어를 조금 넓혀서 다시 확인해 보세요."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
