"use client";

import Link from "next/link";
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
import { buildArchiveHref, buildFollowUpHref } from "@/lib/navigation";
import { contentTypeLabels, followUpLabels } from "@/lib/localize";
import {
  getContentTypeItems,
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
import { CONTENT_TYPES } from "@/types/research";

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
  const latestByType = CONTENT_TYPES.map((type) => ({
    type,
    items: getContentTypeItems(dataset.newsItems, type).slice(0, 3),
  }));

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Dashboard / Today"
        title="오늘의 리서치 흐름"
        description="정적인 숫자판이 아니라, 바로 drill-down 해서 뉴스와 분석, 의견, 모니터링 기록을 다시 읽을 수 있는 private dashboard입니다."
        meta={latestDate ? formatLongDate(latestDate) : "데이터 없음"}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">드릴다운 대시보드</Badge>
          {dataset.preferences.favoriteSlots.map((slot) => (
            <Badge key={slot}>{`${slot}:00 슬롯`}</Badge>
          ))}
        </div>
      </PageIntro>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="오늘 뉴스"
          value={String(todayNews.length)}
          description="오늘 들어온 팩트성 뉴스와 업데이트를 빠르게 확인합니다."
          accent="linear-gradient(90deg, #c89d61, #e4c291)"
          href={buildArchiveHref({ type: "news", date: "today" })}
        />
        <StatCard
          label="중요도 높은 항목"
          value={String(todayNews.filter((item) => item.importance === "Critical").length)}
          description="오늘 기록 중 Critical 레벨만 바로 모아 봅니다."
          accent="linear-gradient(90deg, #8d2d2d, #c88b72)"
          href={buildArchiveHref({ date: "today", priority: "Critical" })}
        />
        <StatCard
          label="팔로업 대기"
          value={String(followUpSummary.pending)}
          description="재확인해야 하는 follow-up 메모를 바로 엽니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
          href={buildFollowUpHref({ status: "Pending" })}
        />
        <StatCard
          label="보유 연관"
          value={String(personalizedNews.length)}
          description="보유 및 관심 종목과 연결된 기록만 다시 모아 봅니다."
          accent="linear-gradient(90deg, #2e6a64, #7ab1a6)"
          href={buildArchiveHref({ linked: "portfolio", date: "today" })}
        />
      </section>

      <SectionCard
        title="콘텐츠 타입별 흐름"
        description="뉴스, 분석, 투자 의견, 모니터링을 분리해서 최신 기록을 바로 읽고 해당 타입 아카이브로 이동할 수 있습니다."
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {latestByType.map(({ type, items }) => (
            <div
              key={type}
              className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.78)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">{contentTypeLabels[type]}</Badge>
                  <p className="mt-3 font-[family:var(--font-display)] text-2xl text-[var(--text-strong)]">
                    {items.length}건
                  </p>
                </div>
                <Link
                  href={buildArchiveHref({ type })}
                  className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
                >
                  전체 보기
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {items.length ? (
                  items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/archive/${item.id}`}
                      className="block rounded-[18px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[rgba(243,239,231,0.9)]"
                    >
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        {getDisplayNewsItem(item).title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {getDisplayNewsItem(item).sourceName}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">아직 기록이 없습니다.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="슬롯 모니터"
          description="09, 13, 18, 22시 슬롯을 누르면 해당 시간대 아카이브 목록으로 이동합니다."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {slotBuckets.map((bucket) => (
              <Link
                key={bucket.slot}
                href={buildArchiveHref({ type: "news", date: "today", slot: bucket.slot })}
                className="group rounded-[24px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_22px_50px_rgba(16,29,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(167,112,49,0.35)]"
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
                          {displayItem.sourceName} · {item.importance}
                        </p>
                      </div>
                    );
                  })}
                  {bucket.items.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      아직 해당 슬롯 기록이 없습니다.
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="테마 흐름"
          description="테마 카드를 누르면 해당 테마 관련 아카이브 목록으로 이동합니다."
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
                  href={buildArchiveHref({ theme: theme.slug })}
                />
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="오늘의 핵심 기록"
        description="카드에서는 요약만 빠르게 보고, 제목을 누르면 구조화된 detail 화면으로 들어갑니다."
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
          title="포트폴리오 연관 기록"
          description="보유 종목, 관심 종목, 관심 테마와 연결된 기록을 우선순위 순으로 다시 보여줍니다."
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
                title="아직 관련 기록이 없습니다"
                description="보유 종목이나 관심 테마를 추가하면 여기부터 우선 정렬됩니다."
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="최근 팔로업 결과"
          description="후속 검증 기록을 카드로 보고, 상태 칩을 누르면 해당 상태 목록으로 이동합니다."
          action={
            <Link
              href={buildFollowUpHref({ status: "Correct" })}
              className="inline-flex items-center gap-2 rounded-full bg-[rgba(23,42,70,0.08)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.12)]"
            >
              <Target className="h-4 w-4" />
              {followUpSummary.correct} {followUpLabels.Correct} / {followUpSummary.mixed}{" "}
              {followUpLabels.Mixed}
            </Link>
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
