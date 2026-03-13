"use client";

import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { NewsCard } from "@/components/research/news-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RichText } from "@/components/ui/rich-text";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayNewsItem, getDisplayTheme } from "@/lib/content-kr";
import { buildArchiveHref } from "@/lib/navigation";
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
        description="현재 데이터셋에 이 slug와 연결된 테마가 없습니다."
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
        description="테마 설명은 markdown 스타일을 지원하고, 관련 뉴스는 archive 흐름과 동일한 카드로 내려옵니다."
        meta={`연결 뉴스 ${relatedNews.length}건`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{themeCategoryLabels[displayTheme.category]}</Badge>
          <Badge>{importanceLabels[displayTheme.priority]}</Badge>
          <Link
            href={buildArchiveHref({ theme: displayTheme.name })}
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            테마 뉴스만 보기
          </Link>
        </div>
      </PageIntro>

      <SectionCard title="테마 설명" description="plain text와 markdown이 모두 읽기 좋게 보이도록 렌더링됩니다.">
        <RichText content={displayTheme.description} />
      </SectionCard>

      <SectionCard title="연결 티커" description="이 테마에 반복적으로 묶인 종목과 자산입니다.">
        <div className="flex flex-wrap gap-2">
          {relatedTickers.map((ticker) => (
            <Badge key={ticker.id}>{ticker.symbol}</Badge>
          ))}
          {relatedTickers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">아직 연결 티커가 없습니다.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="테마 아카이브" description="이 테마와 연결된 뉴스 기록입니다.">
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

      <SectionCard title="결과 추적" description="이 테마에 연결된 뉴스가 실제로 어떻게 전개됐는지 보여줍니다.">
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
              description="관련 뉴스는 있어도 결과 검증 기록은 아직 쌓이지 않았습니다."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
