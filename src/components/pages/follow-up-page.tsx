"use client";

import { useState } from "react";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDisplayFollowUp, getDisplayNewsItem } from "@/lib/content-kr";
import { followUpLabels, regionLabels } from "@/lib/localize";
import { getFollowUpSummary, groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { FOLLOW_UP_STATUSES, REGIONS } from "@/types/research";

export function FollowUpPage() {
  const dataset = useResearchStore((state) => state);
  const tickerMap = groupById(dataset.tickers);
  const followUpSummary = getFollowUpSummary(dataset.followUps);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | (typeof FOLLOW_UP_STATUSES)[number]>("all");
  const [region, setRegion] = useState<"all" | (typeof REGIONS)[number]>("all");
  const [tickerId, setTickerId] = useState("all");

  const filtered = dataset.followUps
    .filter((record) => {
      const sourceNews = dataset.newsItems.find((item) => item.id === record.newsItemId);

      if (!sourceNews) {
        return false;
      }

      if (status !== "all" && record.status !== status) {
        return false;
      }

      if (region !== "all" && sourceNews.region !== region) {
        return false;
      }

      if (tickerId !== "all" && !sourceNews.relatedTickerIds.includes(tickerId)) {
        return false;
      }

      if (search) {
        const query = search.toLowerCase();
        const displayNews = getDisplayNewsItem(sourceNews);
        const displayRecord = getDisplayFollowUp(record);
        const haystack =
          `${displayNews.title} ${displayRecord.outcomeSummary} ${displayRecord.resultNote}`.toLowerCase();
        return haystack.includes(query);
      }

      return true;
    })
    .sort((left, right) => {
      if (!left.resolvedAt && right.resolvedAt) {
        return -1;
      }

      if (left.resolvedAt && !right.resolvedAt) {
        return 1;
      }

      return (right.resolvedAt ?? "").localeCompare(left.resolvedAt ?? "");
    });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="전망 / 팔로업"
        title="결과 검증 루프"
        description="과거 해석이 실제로 어떻게 전개됐는지 기록하고, 맞았는지 틀렸는지 남겨서 리서치 품질을 축적합니다."
        meta={`총 ${dataset.followUps.length}건 팔로업`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">대기 / 적중 / 오판 / 혼합</Badge>
          <Badge variant="outline">결과 기록 추적</Badge>
        </div>
      </PageIntro>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="대기"
          value={String(followUpSummary.pending)}
          description="아직 결과 점검이 남아 있는 해석 건수입니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
        />
        <StatCard
          label="적중"
          value={String(followUpSummary.correct)}
          description="대체로 예상대로 전개된 해석 건수입니다."
          accent="linear-gradient(90deg, #1d7b60, #82b69f)"
        />
        <StatCard
          label="혼합"
          value={String(followUpSummary.mixed)}
          description="일부만 맞았거나 해석이 절반만 유효했던 건수입니다."
          accent="linear-gradient(90deg, #8a6e33, #c8ad70)"
        />
        <StatCard
          label="커버리지"
          value={`${Math.round((dataset.followUps.length / dataset.newsItems.length) * 100)}%`}
          description="전체 뉴스 중 팔로업 기록이 쌓인 비중입니다."
          accent="linear-gradient(90deg, #9f6b2c, #ddb27a)"
        />
      </section>

      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setStatus("all");
          setRegion("all");
          setTickerId("all");
        }}
        filters={[
          {
            label: "상태",
            value: status,
            onChange: (value) => setStatus(value as typeof status),
            options: [
              { label: "전체 상태", value: "all" },
              ...FOLLOW_UP_STATUSES.map((entry) => ({
                label: followUpLabels[entry],
                value: entry,
              })),
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
            label: "티커",
            value: tickerId,
            onChange: setTickerId,
            options: [
              { label: "전체 티커", value: "all" },
              ...dataset.tickers.map((ticker) => ({ label: ticker.symbol, value: ticker.id })),
            ],
          },
        ]}
      />

      <SectionCard
        title="팔로업 원장"
        description={`현재 필터 기준으로 ${filtered.length}건이 표시됩니다.`}
      >
        <div className="space-y-5">
          {filtered.length ? (
            filtered.map((record) => {
              const sourceNews = dataset.newsItems.find((item) => item.id === record.newsItemId);

              if (!sourceNews) {
                return null;
              }

              return (
                <FollowUpCard
                  key={record.id}
                  record={record}
                  newsTitle={getDisplayNewsItem(sourceNews).title}
                  tickerSymbols={sourceNews.relatedTickerIds.map(
                    (entry) => tickerMap[entry]?.symbol ?? entry,
                  )}
                />
              );
            })
          ) : (
            <EmptyState
              title="조건에 맞는 팔로업이 없습니다"
              description="필터를 완화하거나 더 많은 결과 기록이 쌓인 뒤 다시 확인해보세요."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
