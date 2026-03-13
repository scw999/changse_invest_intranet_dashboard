import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDisplayTicker } from "@/lib/content-kr";
import {
  assetClassLabels,
  regionLabels,
} from "@/lib/localize";
import type { Ticker } from "@/types/research";

type TickerCardProps = {
  ticker: Ticker;
  newsCount: number;
  outlookCount: number;
  followUpCount: number;
  trackedStatus?: string;
  href?: string;
};

export function TickerCard({
  ticker,
  newsCount,
  outlookCount,
  followUpCount,
  trackedStatus,
  href,
}: TickerCardProps) {
  const displayTicker = getDisplayTicker(ticker);

  return (
    <Link
      href={href ?? `/tickers/${encodeURIComponent(ticker.symbol)}`}
      className="group flex h-full flex-col rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_20px_55px_rgba(16,29,46,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(16,29,46,0.1)] md:rounded-[28px] md:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{ticker.symbol}</Badge>
        <Badge variant="outline">{assetClassLabels[displayTicker.assetClass]}</Badge>
        <Badge variant="outline">{regionLabels[displayTicker.region]}</Badge>
        {trackedStatus ? <Badge variant="high">{trackedStatus}</Badge> : null}
      </div>
      <h3 className="mt-4 font-[family:var(--font-display)] text-[1.6rem] leading-tight text-[var(--text-strong)] sm:text-3xl">
        {displayTicker.name}
      </h3>
      <p className="mt-1 text-sm font-medium text-[var(--text-faint)]">{displayTicker.exchange}</p>
      <p className="mt-4 flex-1 text-sm leading-7 text-[var(--text-muted)]">{displayTicker.note}</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="뉴스" value={String(newsCount)} />
        <Metric label="전망" value={String(outlookCount)} />
        <Metric label="결과" value={String(followUpCount)} />
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
        티커 보기
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.7)] px-3 py-3">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{value}</p>
    </div>
  );
}
