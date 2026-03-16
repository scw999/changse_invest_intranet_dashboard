"use client";

import { useState } from "react";

import { PageIntro } from "@/components/layout/page-intro";
import { TickerCard } from "@/components/research/ticker-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayTicker } from "@/lib/content-kr";
import { assetClassLabels, regionLabels } from "@/lib/localize";
import { getTickerCoverage } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { ASSET_CLASSES, REGIONS } from "@/types/research";

export function TickersPage() {
  const newsItems = useResearchStore((state) => state.newsItems);
  const allTickers = useResearchStore((state) => state.tickers);
  const themes = useResearchStore((state) => state.themes);
  const followUps = useResearchStore((state) => state.followUps);
  const portfolioItems = useResearchStore((state) => state.portfolioItems);
  const preferences = useResearchStore((state) => state.preferences);
  const dataset = { newsItems, themes, tickers: allTickers, followUps, portfolioItems, preferences };
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<"all" | (typeof REGIONS)[number]>("all");
  const [assetClass, setAssetClass] = useState<"all" | (typeof ASSET_CLASSES)[number]>("all");
  const trackedSymbols = new Map(
    portfolioItems.map((item) => [
      item.symbol,
      item.isHolding ? "보유" : item.isWatchlist ? "관심" : "",
    ]),
  );

  const tickers = allTickers.filter((ticker) => {
    if (region !== "all" && ticker.region !== region) {
      return false;
    }

    if (assetClass !== "all" && ticker.assetClass !== assetClass) {
      return false;
    }

    if (search) {
      const query = search.toLowerCase();
      const displayTicker = getDisplayTicker(ticker);
      const haystack =
        `${displayTicker.symbol} ${displayTicker.name} ${displayTicker.note}`.toLowerCase();
      return haystack.includes(query);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="티커"
        title="추적 티커 유니버스"
        description="각 티커를 뉴스 흐름, 테마, 팔로업 결과와 함께 묶어 두면 아이디어가 흩어지지 않고 종목별 문맥이 살아납니다."
        meta={`총 ${allTickers.length}개 티커`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">보유 여부 반영</Badge>
          <Badge variant="outline">관심종목 반영</Badge>
          <Badge variant="outline">뉴스·전망 이력</Badge>
        </div>
      </PageIntro>

      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setRegion("all");
          setAssetClass("all");
        }}
        filters={[
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
            label: "자산군",
            value: assetClass,
            onChange: (value) => setAssetClass(value as typeof assetClass),
            options: [
              { label: "전체 자산군", value: "all" },
              ...ASSET_CLASSES.map((entry) => ({
                label: assetClassLabels[entry],
                value: entry,
              })),
            ],
          },
        ]}
      />

      <SectionCard
        title="티커 디렉터리"
        description="각 티커 상세 페이지에서 관련 뉴스, 전망, 팔로업 결과를 함께 볼 수 있습니다."
      >
        {tickers.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tickers.map((ticker) => {
              const coverage = getTickerCoverage(dataset, ticker);

              return (
                <TickerCard
                  key={ticker.id}
                  ticker={ticker}
                  newsCount={coverage.newsCount}
                  outlookCount={coverage.outlookCount}
                  followUpCount={coverage.followUpCount}
                  trackedStatus={trackedSymbols.get(ticker.symbol)}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="조건에 맞는 티커가 없습니다"
            description="필터를 넓히거나 더 일반적인 티커명으로 다시 검색해보세요."
          />
        )}
      </SectionCard>
    </div>
  );
}
