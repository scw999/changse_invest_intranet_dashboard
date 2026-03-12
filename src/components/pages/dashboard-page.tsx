"use client";

import { BellRing, Layers3, Sparkles, Target, TrendingUp } from "lucide-react";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { NewsCard } from "@/components/research/news-card";
import { ThemeCard } from "@/components/research/theme-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDisplayNewsItem, getDisplayTheme } from "@/lib/content-kr";
import { followUpLabels, importanceLabels } from "@/lib/localize";
import {
  getFollowUpSummary,
  getLatestNewsDate,
  getPersonalizedNews,
  getSlotBuckets,
  getThemeCoverage,
  getTodayNews,
  groupById,
} from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { formatLongDate } from "@/lib/utils";

export function DashboardPage() {
  const dataset = useResearchStore((state) => state);
  const themeMap = groupById(dataset.themes);
  const tickerMap = groupById(dataset.tickers);

  const todayNews = getTodayNews(dataset.newsItems);
  const latestDate = getLatestNewsDate(dataset.newsItems);
  const slotBuckets = getSlotBuckets(todayNews);
  const personalizedNews = getPersonalizedNews(
    todayNews,
    dataset.tickers,
    dataset.portfolioItems,
    dataset.preferences,
  ).slice(0, 4);
  const recentFollowUps = [...dataset.followUps]
    .sort((left, right) => {
      if (!left.resolvedAt && right.resolvedAt) {
        return -1;
      }

      if (left.resolvedAt && !right.resolvedAt) {
        return 1;
      }

      return (right.resolvedAt ?? "").localeCompare(left.resolvedAt ?? "");
    })
    .slice(0, 4);
  const themePulse = [...dataset.themes]
    .sort(
      (left, right) =>
        getThemeCoverage(dataset, right).newsCount - getThemeCoverage(dataset, left).newsCount,
    )
    .slice(0, 3);
  const followUpSummary = getFollowUpSummary(dataset.followUps);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="대시보드 / 투데이"
        title="오늘의 리서치 운영 화면"
        description="최신 시장 변화와 해석 메모를 빠르게 훑고, 현재 보유 자산과 연결되는 뉴스를 우선적으로 확인할 수 있도록 구성했습니다."
        meta={latestDate ? formatLongDate(latestDate) : "데이터 없음"}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">아시아/서울</Badge>
          {dataset.preferences.favoriteSlots.map((slot) => (
            <Badge key={slot}>{`${slot}:00 슬롯`}</Badge>
          ))}
        </div>
      </PageIntro>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="오늘 뉴스"
          value={String(todayNews.length)}
          description="가장 최근 일일 스캔 기준으로 확인 가능한 뉴스 건수입니다."
          accent="linear-gradient(90deg, #c89d61, #e4c291)"
        />
        <StatCard
          label="핵심"
          value={String(todayNews.filter((item) => item.importance === "Critical").length)}
          description="다음 스캔 전 다시 확인해야 할 최우선 항목 수입니다."
          accent="linear-gradient(90deg, #8d2d2d, #c88b72)"
        />
        <StatCard
          label="팔로업 대기"
          value={String(followUpSummary.pending)}
          description="결과 검증이 아직 끝나지 않은 해석 건수입니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
        />
        <StatCard
          label="보유 연관"
          value={String(personalizedNews.length)}
          description="보유 종목, 관심 종목, 관심 테마와 연결된 오늘 뉴스 수입니다."
          accent="linear-gradient(90deg, #2e6a64, #7ab1a6)"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="슬롯 모니터"
          description="09시, 13시, 18시, 22시 네 번의 체크포인트 기준으로 무엇이 추가됐고 무엇이 더 판단이 필요한지 빠르게 봅니다."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {slotBuckets.map((bucket) => (
              <div
                key={bucket.slot}
                className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
                      {bucket.slot}:00 KST
                    </p>
                    <p className="mt-1 font-[family:var(--font-display)] text-2xl text-[var(--text-strong)]">
                      {bucket.items.length}건
                    </p>
                  </div>
                  <div className="rounded-full bg-white/80 p-3 text-[var(--text-muted)]">
                    {bucket.slot === "09" ? (
                      <Sparkles className="h-5 w-5" />
                    ) : bucket.slot === "13" ? (
                      <BellRing className="h-5 w-5" />
                    ) : bucket.slot === "18" ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <Layers3 className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {bucket.items.slice(0, 3).map((item) => {
                    const displayItem = getDisplayNewsItem(item);

                    return (
                      <div
                        key={item.id}
                        className="rounded-[20px] border border-[var(--border-soft)] bg-white/80 px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[var(--text-strong)]">
                          {displayItem.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {displayItem.sourceName} · {importanceLabels[displayItem.importance]}
                        </p>
                      </div>
                    );
                  })}
                  {bucket.items.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      아직 이 슬롯에 등록된 뉴스가 없습니다.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="테마 흐름"
          description="현재 리서치 북에서 가장 빠르게 쌓이는 테마를 먼저 보여줍니다."
        >
          <div className="space-y-4">
            {themePulse.map((theme) => {
              const coverage = getThemeCoverage(dataset, theme);

              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  newsCount={coverage.newsCount}
                  pendingCount={coverage.pendingCount}
                  followUpCount={coverage.followUpCount}
                />
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="고확신 핵심 뉴스"
        description="가장 최근 스캔에서 중요도가 높은 뉴스를 빠르게 읽고 바로 해석할 수 있게 정리했습니다."
      >
        <div className="space-y-5">
          {todayNews.slice(0, 5).map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              themeNames={item.relatedThemeIds.map(
                (themeId) => (themeMap[themeId] ? getDisplayTheme(themeMap[themeId]).name : themeId),
              )}
              tickerSymbols={item.relatedTickerIds.map(
                (tickerId) => tickerMap[tickerId]?.symbol ?? tickerId,
              )}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="내 포트폴리오 연관 뉴스"
          description="보유 종목, 관심 종목, 관심 테마를 기준으로 우선순위를 올린 개인화 영역입니다."
        >
          <div className="space-y-5">
            {personalizedNews.length ? (
              personalizedNews.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  relevanceScore={item.relevanceScore}
                  themeNames={item.relatedThemeIds.map(
                    (themeId) => (themeMap[themeId] ? getDisplayTheme(themeMap[themeId]).name : themeId),
                  )}
                  tickerSymbols={item.relatedTickerIds.map(
                    (tickerId) => tickerMap[tickerId]?.symbol ?? tickerId,
                  )}
                />
              ))
            ) : (
              <EmptyState
                title="아직 연관 뉴스가 없습니다"
                description="보유 종목, 관심 종목, 관심 테마를 추가하면 관련 뉴스가 이 영역에 먼저 올라옵니다."
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="최근 팔로업 점검"
          description="이전 해석이 실제로 어떻게 전개됐는지 기록해 두면 이 화면이 단순 뉴스 피드가 아니라 리서치 메모리로 바뀝니다."
          action={
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(23,42,70,0.08)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]">
              <Target className="h-4 w-4" />
              {followUpSummary.correct} {followUpLabels.Correct} / {followUpSummary.mixed}{" "}
              {followUpLabels.Mixed}
            </div>
          }
        >
          <div className="space-y-5">
            {recentFollowUps.map((record) => {
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
                    (tickerId) => tickerMap[tickerId]?.symbol ?? tickerId,
                  )}
                />
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
