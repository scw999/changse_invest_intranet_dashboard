import { Badge } from "@/components/ui/badge";
import { getDisplayPortfolioItem } from "@/lib/content-kr";
import {
  portfolioAssetTypeLabels,
  priorityLabels,
  regionLabels,
} from "@/lib/localize";
import type { PortfolioItem } from "@/types/research";

type PortfolioCardProps = {
  item: PortfolioItem;
};

export function PortfolioCard({ item }: PortfolioCardProps) {
  const displayItem = getDisplayPortfolioItem(item);

  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_20px_50px_rgba(16,29,46,0.06)] md:rounded-[26px] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{displayItem.symbol}</Badge>
        <Badge variant="outline">{portfolioAssetTypeLabels[displayItem.assetType]}</Badge>
        <Badge variant="outline">{regionLabels[displayItem.region]}</Badge>
        {displayItem.isHolding ? <Badge variant="bullish">보유</Badge> : null}
        {displayItem.isWatchlist ? <Badge variant="high">관심</Badge> : null}
        <Badge>{priorityLabels[displayItem.priority]}</Badge>
      </div>
      <h3 className="mt-4 font-[family:var(--font-display)] text-[1.6rem] leading-tight text-[var(--text-strong)] sm:text-3xl">
        {displayItem.assetName}
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="비중" value={displayItem.weight ? `${displayItem.weight}%` : "없음"} />
        <Metric
          label="평균단가"
          value={typeof displayItem.averageCost === "number" ? `${displayItem.averageCost}` : "없음"}
        />
      </div>
      {displayItem.memo ? (
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{displayItem.memo}</p>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.7)] px-3 py-3">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
    </div>
  );
}
