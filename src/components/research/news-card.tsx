import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import { getDisplayNewsItem } from "@/lib/content-kr";
import {
  ContentTypeBadge,
  DirectionBadge,
  FollowUpBadge,
  ImportanceBadge,
  RegionBadge,
  SlotBadge,
} from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/ui/rich-text";
import { buildArchiveHref } from "@/lib/navigation";
import type { NewsItem } from "@/types/research";
import { formatPublishedAt } from "@/lib/utils";

type NewsCardProps = {
  item: NewsItem;
  themeNames: string[];
  tickerSymbols: string[];
  relevanceScore?: number;
};

export function NewsCard({
  item,
  themeNames,
  tickerSymbols,
  relevanceScore,
}: NewsCardProps) {
  const displayItem = getDisplayNewsItem(item);
  const detailHref = `/archive/${item.id}`;
  const contentType = item.contentType ?? "news";

  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_22px_55px_rgba(16,29,46,0.06)] md:rounded-[28px] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ContentTypeBadge value={contentType} />
        <ImportanceBadge value={displayItem.importance} />
        <SlotBadge value={displayItem.scanSlot} />
        <RegionBadge value={displayItem.region} />
        <DirectionBadge value={displayItem.directionalView} />
        <FollowUpBadge value={displayItem.followUpStatus} />
        {typeof relevanceScore === "number" ? (
          <Badge variant="outline">{`연관도 ${relevanceScore}점`}</Badge>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <Link
            href={detailHref}
            className="inline-block rounded-[18px] transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(167,112,49,0.32)]"
          >
            <h3 className="font-[family:var(--font-display)] text-[1.45rem] leading-[1.1] text-[var(--text-strong)] sm:text-[1.65rem]">
              {displayItem.title}
            </h3>
          </Link>
          <RichText
            content={displayItem.summary}
            compact
            className="mt-3 text-sm text-[var(--text-muted)]"
          />
        </div>
        <div className="w-full rounded-[20px] border border-[var(--border-soft)] bg-[rgba(242,235,224,0.55)] px-4 py-3 text-sm text-[var(--text-muted)] md:w-auto md:rounded-[22px]">
          <p className="font-semibold text-[var(--text-strong)]">{displayItem.sourceName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {formatPublishedAt(displayItem.publishedAt)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.74)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            시장 해석
          </p>
          <RichText
            content={displayItem.marketInterpretation}
            compact
            className="mt-2 text-sm text-[var(--text-strong)]"
          />
        </div>
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            액션 아이디어
          </p>
          <RichText
            content={displayItem.actionIdea}
            compact
            className="mt-2 text-sm text-[var(--text-strong)]"
          />
        </div>
      </div>

      {contentType === "monitoring" && item.monitoring ? (
        <div className="mt-5 rounded-[24px] border border-[var(--border-soft)] bg-[rgba(229,239,236,0.58)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            모니터링 포인트
          </p>
          <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            {item.monitoring.targetTickers?.length ? (
              <p>{`대상: ${item.monitoring.targetTickers.join(", ")}`}</p>
            ) : null}
            {item.monitoring.triggerCondition ? <p>{item.monitoring.triggerCondition}</p> : null}
            {item.monitoring.nextCheckNote ? <p>{item.monitoring.nextCheckNote}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {themeNames.map((themeName) => (
          <Link key={themeName} href={buildArchiveHref({ theme: themeName })}>
            <Badge variant="outline">{themeName}</Badge>
          </Link>
        ))}
        {tickerSymbols.map((tickerSymbol) => (
          <Link key={tickerSymbol} href={buildArchiveHref({ ticker: tickerSymbol })}>
            <Badge>{tickerSymbol}</Badge>
          </Link>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            후속 메모
          </p>
          <RichText
            content={displayItem.followUpNote}
            compact
            className="mt-2 text-sm text-[var(--text-muted)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)] transition hover:text-[var(--accent)]"
          >
            상세 보기
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href={displayItem.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)] transition hover:text-[var(--accent)]"
          >
            원문 보기
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
