import { getDisplayFollowUp } from "@/lib/content-kr";
import { FollowUpBadge } from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/ui/rich-text";
import type { FollowUpRecord } from "@/types/research";
import { formatPublishedAt } from "@/lib/utils";

type FollowUpCardProps = {
  record: FollowUpRecord;
  newsTitle: string;
  tickerSymbols: string[];
};

export function FollowUpCard({
  record,
  newsTitle,
  tickerSymbols,
}: FollowUpCardProps) {
  const displayRecord = getDisplayFollowUp(record);

  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_18px_40px_rgba(16,29,46,0.06)] md:rounded-[28px] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <FollowUpBadge value={displayRecord.status} />
        {displayRecord.resolvedAt ? (
          <Badge variant="outline">{formatPublishedAt(displayRecord.resolvedAt)}</Badge>
        ) : (
          <Badge variant="outline">검토 대기</Badge>
        )}
        {tickerSymbols.map((tickerSymbol) => (
          <Badge key={tickerSymbol}>{tickerSymbol}</Badge>
        ))}
      </div>
      <h3 className="mt-4 font-[family:var(--font-display)] text-[1.55rem] leading-tight text-[var(--text-strong)] sm:text-3xl">
        {newsTitle}
      </h3>
      <RichText
        content={displayRecord.outcomeSummary}
        compact
        className="mt-4 text-sm text-[var(--text-muted)]"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            결과 메모
          </p>
          <RichText
            content={displayRecord.resultNote}
            compact
            className="mt-2 text-sm text-[var(--text-strong)]"
          />
        </div>
        <div className="rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.6)] p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--text-faint)] uppercase">
            시장 반응
          </p>
          <RichText
            content={displayRecord.marketImpact}
            compact
            className="mt-2 text-sm text-[var(--text-strong)]"
          />
        </div>
      </div>
    </article>
  );
}
