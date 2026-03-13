"use client";

import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";
import { FollowUpCard } from "@/components/research/follow-up-card";
import { NewsCard } from "@/components/research/news-card";
import { PortfolioCard } from "@/components/research/portfolio-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RichText } from "@/components/ui/rich-text";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayNewsItem, getDisplayTheme, getDisplayTicker } from "@/lib/content-kr";
import { buildArchiveHref } from "@/lib/navigation";
import { assetClassLabels, regionLabels } from "@/lib/localize";
import { groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";

export function TickerDetailPage({ symbol }: { symbol: string }) {
  const dataset = useResearchStore((state) => state);
  const ticker = dataset.tickers.find((entry) => entry.symbol === decodeURIComponent(symbol));
  const themeMap = groupById(dataset.themes);
  const tickerMap = groupById(dataset.tickers);

  if (!ticker) {
    return (
      <EmptyState
        title="티커를 찾을 수 없습니다"
        description="현재 데이터셋에 이 심볼과 연결된 티커가 없습니다."
      />
    );
  }

  const displayTicker = getDisplayTicker(ticker);
  const relatedNews = dataset.newsItems.filter((item) => item.relatedTickerIds.includes(ticker.id));
  const relatedFollowUps = dataset.followUps.filter((record) =>
    relatedNews.some((item) => item.id === record.newsItemId),
  );
  const portfolioEntry = dataset.portfolioItems.find((item) => item.symbol === ticker.symbol);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="티커 상세"
        title={`${displayTicker.symbol} · ${displayTicker.name}`}
        description="티커 노트는 상세 페이지에서 article처럼 읽히고, 관련 뉴스는 archive 흐름 그대로 이어집니다."
        meta={`연결 뉴스 ${relatedNews.length}건`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{displayTicker.exchange}</Badge>
          <Badge variant="outline">{regionLabels[displayTicker.region]}</Badge>
          <Badge>{assetClassLabels[displayTicker.assetClass]}</Badge>
          <Link
            href={buildArchiveHref({ ticker: displayTicker.symbol })}
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            이 티커 뉴스만 보기
          </Link>
        </div>
      </PageIntro>

      <SectionCard title="티커 노트" description="markdown 문법이 없어도 문단과 줄바꿈을 유지합니다.">
        <RichText content={displayTicker.note} />
      </SectionCard>

      {portfolioEntry ? (
        <SectionCard
          title="포트폴리오 맥락"
          description="현재 개인 포트폴리오 안에서 이 자산이 어떤 위치인지 보여줍니다."
        >
          <PortfolioCard item={portfolioEntry} />
        </SectionCard>
      ) : null}

      <SectionCard title="티커 아카이브" description="이 티커와 연결된 모든 뉴스 기록입니다.">
        <div className="space-y-5">
          {relatedNews.length ? (
            relatedNews.map((item) => (
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
            ))
          ) : (
            <EmptyState
              title="연결된 뉴스가 없습니다"
              description="이 티커는 아직 seed 뉴스와 직접 연결되지 않았습니다."
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="결과 이력" description="관련 뉴스가 실제로 어떻게 전개됐는지 모아 둔 영역입니다.">
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
              title="아직 팔로업 결과가 없습니다"
              description="follow-up 상태와 메모가 누적되면 여기서 시간순으로 확인할 수 있습니다."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
