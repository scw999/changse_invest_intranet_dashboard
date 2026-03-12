import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import { getDisplayNewsItem } from "@/lib/content-kr";
import {
  DirectionBadge,
  FollowUpBadge,
  ImportanceBadge,
  RegionBadge,
  SlotBadge,
} from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
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

  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_22px_55px_rgba(16,29,46,0.06)] md:rounded-[28px] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
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
          <h3 className="font-[family:var(--font-display)] text-[1.45rem] leading-[1.1] text-[var(--text-strong)] sm:text-[1.65rem]">
            {displayItem.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] md:leading-7">
            {displayItem.summary}
          </p>
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
          <p className="mt-2 text-sm leading-7 text-[var(--text-strong)]">
            {displayItem.marketInterpretation}
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            대응 아이디어
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-strong)]">{displayItem.actionIdea}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {themeNames.map((themeName) => (
          <Badge key={themeName} variant="outline">
            {themeName}
          </Badge>
        ))}
        {tickerSymbols.map((tickerSymbol) => (
          <Badge key={tickerSymbol}>{tickerSymbol}</Badge>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            팔로업 메모
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)] md:leading-7">
            {displayItem.followUpNote}
          </p>
        </div>
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
    </article>
  );
}
