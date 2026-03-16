"use client";

import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";
import {
  ContentTypeBadge,
  DirectionBadge,
  FollowUpBadge,
  ImportanceBadge,
  RegionBadge,
  SlotBadge,
} from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RichText } from "@/components/ui/rich-text";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayNewsItem, getDisplayTheme } from "@/lib/content-kr";
import { buildArchiveHref, buildFollowUpHref } from "@/lib/navigation";
import { groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { formatLongDate, formatPublishedAt } from "@/lib/utils";

export function NewsDetailPage({ id }: { id: string }) {
  const newsItems = useResearchStore((state) => state.newsItems);
  const themes = useResearchStore((state) => state.themes);
  const tickers = useResearchStore((state) => state.tickers);
  const followUps = useResearchStore((state) => state.followUps);
  const item = newsItems.find((entry) => entry.id === id);
  const themeMap = groupById(themes);
  const tickerMap = groupById(tickers);
  const followUp = followUps.find((entry) => entry.newsItemId === id);

  if (!item) {
    return (
      <EmptyState
        title="기록을 찾을 수 없습니다"
        description="현재 데이터셋에 해당 기록이 없거나 경로가 바뀌었습니다."
      />
    );
  }

  const displayItem = getDisplayNewsItem(item);
  const contentType = item.contentType ?? "news";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Archive Detail"
        title={displayItem.title}
        description={displayItem.summary}
        meta={formatLongDate(displayItem.publishedAt)}
      >
        <div className="flex flex-wrap gap-2">
          <ContentTypeBadge value={contentType} />
          <ImportanceBadge value={displayItem.importance} />
          <SlotBadge value={displayItem.scanSlot} />
          <RegionBadge value={displayItem.region} />
          <DirectionBadge value={displayItem.directionalView} />
          <FollowUpBadge value={displayItem.followUpStatus} />
          <Link
            href="/archive"
            className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            아카이브로
          </Link>
        </div>
      </PageIntro>

      <SectionCard
        title="기본 정보"
        description="카드에서는 요약만 보고, 상세에서는 해석과 액션, 후속 확인 포인트를 구조적으로 읽도록 구성했습니다."
      >
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
              출처와 시각
            </p>
            <p className="mt-3 font-semibold text-[var(--text-strong)]">{displayItem.sourceName}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {formatPublishedAt(displayItem.publishedAt)}
            </p>
            <Link
              href={displayItem.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)] transition hover:text-[var(--accent)]"
            >
              원문 바로가기
            </Link>
          </div>
          <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.72)] p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
              연결 맥락
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.relatedThemeIds.map((themeId) => {
                const themeName = themeMap[themeId] ? getDisplayTheme(themeMap[themeId]).name : themeId;
                return (
                  <Link key={themeId} href={buildArchiveHref({ theme: themeName })}>
                    <Badge variant="outline">{themeName}</Badge>
                  </Link>
                );
              })}
              {item.relatedTickerIds.map((tickerId) => {
                const symbol = tickerMap[tickerId]?.symbol ?? tickerId;
                return (
                  <Link key={tickerId} href={buildArchiveHref({ ticker: symbol })}>
                    <Badge>{symbol}</Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      {contentType === "monitoring" && item.monitoring ? (
        <SectionCard
          title="모니터링 포인트"
          description="뉴스와 달리 추적 대상, 트리거 조건, 다음 확인 메모를 별도로 읽을 수 있게 분리했습니다."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[var(--border-soft)] bg-[rgba(229,239,236,0.58)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
                대상과 기준
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {item.monitoring.targetTickers?.length ? (
                  <p>{`대상 티커: ${item.monitoring.targetTickers.join(", ")}`}</p>
                ) : null}
                {item.monitoring.referencePrice ? (
                  <p>{`기준 가격: ${item.monitoring.referencePrice}`}</p>
                ) : null}
                {item.monitoring.currentSnapshot ? (
                  <p>{`현재 스냅샷: ${item.monitoring.currentSnapshot}`}</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
                이유와 다음 체크
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {item.monitoring.note ? <p>{item.monitoring.note}</p> : null}
                {item.monitoring.triggerCondition ? <p>{item.monitoring.triggerCondition}</p> : null}
                {item.monitoring.nextCheckNote ? <p>{item.monitoring.nextCheckNote}</p> : null}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="시장 해석" description="긴 해석 메모도 markdown 스타일로 읽기 좋게 렌더링합니다.">
        <RichText content={displayItem.marketInterpretation} />
      </SectionCard>

      <SectionCard title="액션 아이디어" description="의견형 기록은 가설, 비중 판단, 실행 아이디어가 잘 읽히도록 간격을 넉넉히 둡니다.">
        <RichText content={displayItem.actionIdea} />
      </SectionCard>

      <SectionCard title="후속 메모" description="검증해야 할 항목과 follow-up 링크를 함께 확인할 수 있습니다.">
        <RichText content={displayItem.followUpNote} />
        {followUp ? (
          <div className="mt-5">
            <Link
              href={buildFollowUpHref({ status: followUp.status })}
              className="inline-flex items-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
            >
              같은 후속 상태 보기
            </Link>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
