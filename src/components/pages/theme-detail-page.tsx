"use client";

import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { NewsCard } from "@/components/research/news-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayNewsItem, getDisplayTheme } from "@/lib/content-kr";
import { importanceLabels, themeCategoryLabels } from "@/lib/localize";
import { groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";

export function ThemeDetailPage({ slug }: { slug: string }) {
  const dataset = useResearchStore((state) => state);
  const theme = dataset.themes.find((entry) => entry.slug === slug);
  const tickerMap = groupById(dataset.tickers);
  const themeMap = groupById(dataset.themes);

  if (!theme) {
    return (
      <EmptyState
        title="테마를 찾을 수 없습니다"
        description="현재 시드 데이터에 이 슬러그와 연결된 테마가 없습니다."
      />
    );
  }

  const displayTheme = getDisplayTheme(theme);
  const relatedNews = dataset.newsItems.filter((item) => item.relatedThemeIds.includes(theme.id));
  const relatedFollowUps = dataset.followUps.filter((record) =>
    relatedNews.some((item) => item.id === record.newsItemId),
  );
  const relatedTickers = dataset.tickers.filter((ticker) =>
    relatedNews.some((item) => item.relatedTickerIds.includes(ticker.id)),
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="테마 상세"
        title={displayTheme.name}
        description={displayTheme.description}
        meta={`연결된 뉴스 ${relatedNews.length}건`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{themeCategoryLabels[displayTheme.category]}</Badge>
          <Badge>{importanceLabels[displayTheme.priority]}</Badge>
          <Link
            href="/themes"
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            테마 목록으로
          </Link>
        </div>
      </PageIntro>

      <SectionCard
        title="연결 티커"
        description="현재 이 테마 안에서 함께 언급되는 종목과 자산입니다."
      >
        <div className="flex flex-wrap gap-2">
          {relatedTickers.map((ticker) => (
            <Badge key={ticker.id}>{ticker.symbol}</Badge>
          ))}
          {relatedTickers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">아직 연결된 티커가 없습니다.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="테마 아카이브" description="이 테마에 연결된 모든 뉴스 기록입니다.">
        <div className="space-y-5">
          {relatedNews.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              themeNames={item.relatedThemeIds.map((entry) =>
                themeMap[entry] ? getDisplayTheme(themeMap[entry]).name : entry,
              )}
              tickerSymbols={item.relatedTickerIds.map(
                (entry) => tickerMap[entry]?.symbol ?? entry,
              )}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="결과 점검"
        description="이 테마에 연결된 해석이 실제로 어떻게 전개됐는지 추적한 기록입니다."
      >
        <div className="space-y-5">
          {relatedFollowUps.length ? (
            relatedFollowUps.map((record) => {
              const sourceNews = relatedNews.find((item) => item.id === record.newsItemId);

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
              title="아직 팔로업 기록이 없습니다"
              description="이 테마는 뉴스는 쌓였지만 결과 검증 기록은 아직 추가되지 않았습니다."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
