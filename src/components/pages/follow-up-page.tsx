"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDisplayFollowUp, getDisplayNewsItem } from "@/lib/content-kr";
import { buildFollowUpHref } from "@/lib/navigation";
import { followUpLabels, regionLabels } from "@/lib/localize";
import { getFollowUpSummary, groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { FOLLOW_UP_STATUSES, REGIONS } from "@/types/research";

export function FollowUpPage() {
  const dataset = useResearchStore((state) => state);
  const tickerMap = groupById(dataset.tickers);
  const followUpSummary = getFollowUpSummary(dataset.followUps);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const derivedState = useMemo(
    () => ({
      search: searchParams.get("q") ?? "",
      status:
        (searchParams.get("status") as "all" | (typeof FOLLOW_UP_STATUSES)[number] | null) ?? "all",
      region: (searchParams.get("region") as "all" | (typeof REGIONS)[number] | null) ?? "all",
      tickerId:
        dataset.tickers.find(
          (ticker) =>
            ticker.symbol === searchParams.get("ticker") || ticker.id === searchParams.get("ticker"),
        )?.id ?? "all",
    }),
    [dataset.tickers, searchParams],
  );

  const [search, setSearch] = useState(derivedState.search);
  const [status, setStatus] = useState<"all" | (typeof FOLLOW_UP_STATUSES)[number]>(
    derivedState.status,
  );
  const [region, setRegion] = useState<"all" | (typeof REGIONS)[number]>(derivedState.region);
  const [tickerId, setTickerId] = useState(derivedState.tickerId);

  useEffect(() => {
    setSearch(derivedState.search);
    setStatus(derivedState.status);
    setRegion(derivedState.region);
    setTickerId(derivedState.tickerId);
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
        eyebrow="팔로업 / 결과 검증"
        title="후속 검증 루프"
        description="대시보드 카드에서 Pending, Correct 같은 상태를 눌러 이 화면으로 내려오도록 연결했습니다."
        meta={`총 ${dataset.followUps.length}건 팔로업`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">상태 기반 drill-down</Badge>
          <Badge variant="outline">티커 / 지역 필터</Badge>
        </div>
      </PageIntro>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="대기"
          value={String(followUpSummary.pending)}
          description="아직 결과가 확인되지 않은 follow-up만 봅니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
          href={buildFollowUpHref({ status: "Pending" })}
        />
        <StatCard
          label="정확"
          value={String(followUpSummary.correct)}
          description="예상과 비슷하게 전개된 건만 모아서 봅니다."
          accent="linear-gradient(90deg, #1d7b60, #82b69f)"
          href={buildFollowUpHref({ status: "Correct" })}
        />
        <StatCard
          label="혼합"
          value={String(followUpSummary.mixed)}
          description="부분적으로만 맞았던 케이스를 다시 검토합니다."
          accent="linear-gradient(90deg, #8a6e33, #c8ad70)"
          href={buildFollowUpHref({ status: "Mixed" })}
        />
        <StatCard
          label="커버리지"
          value={`${Math.round((dataset.followUps.length / Math.max(dataset.newsItems.length, 1)) * 100)}%`}
          description="뉴스 대비 후속 검증 기록 비율입니다."
          accent="linear-gradient(90deg, #9f6b2c, #ddb27a)"
        />
      </section>

      <FilterToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateQuery({ q: value });
        }}
        onReset={() => {
          setSearch("");
          setStatus("all");
          setRegion("all");
          setTickerId("all");
          updateQuery({ q: "", status: "", region: "", ticker: "" });
        }}
        filters={[
          {
            label: "상태",
            value: status,
            onChange: (value) => {
              setStatus(value as typeof status);
              updateQuery({ status: value });
            },
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
        ]}
      />

      <SectionCard
        title="팔로업 기록"
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
              description="상태나 티커 필터를 조금 넓혀서 다시 확인해보세요."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
