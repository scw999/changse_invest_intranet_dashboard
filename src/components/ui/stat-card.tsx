import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  accent?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  description,
  accent,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_20px_45px_rgba(16,29,46,0.06)] md:rounded-[24px]",
        className,
      )}
    >
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
    </div>
  );
}
