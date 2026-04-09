"use client";

import { useMemo } from "react";
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
import { InlineImageGroup, NewsImageGallery } from "@/components/ui/news-image";
import { RichText } from "@/components/ui/rich-text";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayNewsItem, getDisplayTheme } from "@/lib/content-kr";
import { buildArchiveHref, buildFollowUpHref } from "@/lib/navigation";
import { groupById } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { formatLongDate, formatPublishedAt } from "@/lib/utils";
import type { ImageAttachment } from "@/types/research";

const SECTION_ANCHOR_KEYS: Record<string, string[]> = {
  "market-interpretation": ["market-interpretation", "시장해석", "market"],
  "action-idea": ["action-idea", "액션아이디어", "action"],
  "follow-up": ["follow-up", "후속메모", "followup"],
  monitoring: ["monitoring", "모니터링"],
};

function classifyImages(images?: ImageAttachment[]) {
  if (!images || images.length === 0) {
    return { inlineBySection: new Map<string, ImageAttachment[]>(), galleryImages: [] };
  }

  const inlineBySection = new Map<string, ImageAttachment[]>();
  const galleryImages: ImageAttachment[] = [];

  for (const image of images) {
    if (image.placement === "inline" && image.anchorKey) {
      const normalizedKey = image.anchorKey.toLowerCase().replace(/[\s_]/g, "");
      let matchedSection: string | null = null;

      for (const [sectionKey, aliases] of Object.entries(SECTION_ANCHOR_KEYS)) {
        if (aliases.includes(normalizedKey) || normalizedKey === sectionKey) {
          matchedSection = sectionKey;
          break;
        }
      }

      if (!matchedSection) {
        matchedSection = image.anchorKey;
      }

      const existing = inlineBySection.get(matchedSection) ?? [];
      existing.push(image);
      inlineBySection.set(matchedSection, existing);
    } else {
      galleryImages.push(image);
    }
  }

  return { inlineBySection, galleryImages };
}

export function NewsDetailPage({ id }: { id: string }) {
  const newsItems = useResearchStore((state) => state.newsItems);
  const themes = useResearchStore((state) => state.themes);
  const tickers = useResearchStore((state) => state.tickers);
  const followUps = useResearchStore((state) => state.followUps);
  const item = newsItems.find((entry) => entry.id === id);
  const themeMap = groupById(themes);
  const tickerMap = groupById(tickers);
  const followUp = followUps.find((entry) => entry.newsItemId === id);

  const { inlineBySection, galleryImages } = useMemo(
    () => classifyImages(item?.images),
    [item?.images],
  );

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

      <SectionCard title="기본 정보">
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
        <SectionCard title="모니터링 포인트">
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
          <InlineImageGroup images={inlineBySection.get("monitoring") ?? []} />
        </SectionCard>
      ) : null}

      <SectionCard title="시장 해석">
        <RichText content={displayItem.marketInterpretation} />
        <InlineImageGroup images={inlineBySection.get("market-interpretation") ?? []} />
      </SectionCard>

      <SectionCard title="액션 아이디어">
        <RichText content={displayItem.actionIdea} />
        <InlineImageGroup images={inlineBySection.get("action-idea") ?? []} />
      </SectionCard>

      <SectionCard title="후속 메모">
        <RichText content={displayItem.followUpNote} />
        <InlineImageGroup images={inlineBySection.get("follow-up") ?? []} />
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

      {galleryImages.length > 0 ? (
        <SectionCard title="첨부 이미지">
          <NewsImageGallery images={galleryImages} />
        </SectionCard>
      ) : null}
    </div>
  );
}
