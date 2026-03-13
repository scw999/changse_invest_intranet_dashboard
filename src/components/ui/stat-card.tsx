import Link from "next/link";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  accent?: string;
  className?: string;
  href?: string;
};

export function StatCard({
  label,
  value,
  description,
  accent,
  className,
  href,
}: StatCardProps) {
  const classes = cn(
    "rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_20px_45px_rgba(16,29,46,0.06)] transition md:rounded-[24px]",
    href
      ? "group block hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_26px_55px_rgba(16,29,46,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(167,112,49,0.35)]"
      : "",
    className,
  );

  const content = (
    <>
      <div
        className="mb-4 h-1.5 w-12 rounded-full"
        style={{ background: accent ?? "linear-gradient(90deg, #c89d61, #40657b)" }}
      />
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </p>
      <p className="mt-2 font-[family:var(--font-display)] text-[2.6rem] leading-none text-[var(--text-strong)] sm:text-4xl">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
    </>
  );

  if (href) {
    return <Link href={href} className={classes}>{content}</Link>;
  }

  return <div className={classes}>{content}</div>;
}
