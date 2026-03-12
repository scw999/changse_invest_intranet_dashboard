"use client";

import { useState } from "react";

import { PageIntro } from "@/components/layout/page-intro";
import { NewsCard } from "@/components/research/news-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayTheme } from "@/lib/content-kr";
import { importanceLabels, newsSortLabels, regionLabels } from "@/lib/localize";
import { filterNewsItems, getUniqueDateKeys, groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { formatCalendarDate } from "@/lib/utils";
import { IMPORTANCE_LEVELS, NEWS_SORT_OPTIONS, REGIONS, SCAN_SLOTS } from "@/types/research";

export function ArchivePage() {
  const dataset = useResearchStore((state) => state);
  const themeMap = groupById(dataset.themes);
  const tickerMap = groupById(dataset.tickers);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("all");
  const [slot, setSlot] = useState<"all" | (typeof SCAN_SLOTS)[number]>("all");
  const [region, setRegion] = useState<"all" | (typeof REGIONS)[number]>("all");
  const [themeId, setThemeId] = useState("all");
  const [tickerId, setTickerId] = useState("all");
  const [importance, setImportance] = useState<"all" | (typeof IMPORTANCE_LEVELS)[number]>(
    "all",
  );
  const [sort, setSort] = useState<(typeof NEWS_SORT_OPTIONS)[number]>(
    dataset.preferences.preferredSort,
  );

  const filteredNews = filterNewsItems(dataset.newsItems, {
    search,
    date,
    slot,
    region,
    themeId,
    tickerId,
    importance,
    sort,
  });

  const resetFilters = () => {
    setSearch("");
    setDate("all");
    setSlot("all");
    setRegion("all");
    setThemeId("all");
    setTickerId("all");
    setImportance("all");
    setSort(dataset.preferences.preferredSort);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="아카이브"
        title="날짜·슬롯·테마·티커 기준 아카이브"
        description="리서치 운영 흐름에 맞춰 날짜, 업데이트 슬롯, 테마, 티커 기준으로 과거 기록을 다시 탐색할 수 있습니다."
        meta={`총 ${dataset.newsItems.length}건 보관`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">날짜별 탐색</Badge>
          <Badge variant="outline">중요도 정렬</Badge>
          <Badge variant="outline">테마·티커 필터</Badge>
        </div>
      </PageIntro>

      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        filters={[
          {
            label: "날짜",
            value: date,
            onChange: setDate,
            options: [
              { label: "전체 날짜", value: "all" },
              ...getUniqueDateKeys(dataset.newsItems).map((dateKey) => ({
                label: formatCalendarDate(`${dateKey}T00:00:00+09:00`),
                value: dateKey,
              })),
            ],
          },
          {
            label: "슬롯",
            value: slot,
            onChange: (value) => setSlot(value as typeof slot),
            options: [
              { label: "전체 슬롯", value: "all" },
              ...SCAN_SLOTS.map((entry) => ({ label: `${entry}:00`, value: entry })),
            ],
          },
          {
            label: "지역",
            value: region,
            onChange: (value) => setRegion(value as typeof region),
            options: [
              { label: "전체 지역", value: "all" },
              ...REGIONS.map((entry) => ({ label: regionLabels[entry], value: entry })),
            ],
          },
          {
            label: "테마",
            value: themeId,
            onChange: setThemeId,
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
            onChange: setTickerId,
            options: [
              { label: "전체 티커", value: "all" },
              ...dataset.tickers.map((ticker) => ({ label: ticker.symbol, value: ticker.id })),
            ],
          },
          {
            label: "중요도",
            value: importance,
            onChange: (value) => setImportance(value as typeof importance),
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
            onChange: (value) => setSort(value as typeof sort),
            options: NEWS_SORT_OPTIONS.map((entry) => ({
              label: newsSortLabels[entry],
              value: entry,
            })),
          },
        ]}
      />

      <SectionCard
        title="아카이브 결과"
        description={`현재 필터 기준으로 ${filteredNews.length}건이 검색되었습니다.`}
      >
        <div className="space-y-5">
          {filteredNews.length ? (
            filteredNews.map((item) => (
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
              title="조건에 맞는 뉴스가 없습니다"
              description="날짜, 테마, 티커, 중요도 필터를 조금 더 넓혀서 다시 확인해보세요."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
