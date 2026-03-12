import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?:
    | "default"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "bullish"
    | "bearish"
    | "mixed"
    | "pending"
    | "outline";
  className?: string;
};

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-[rgba(23,42,70,0.08)] text-[var(--text-strong)]",
  critical: "bg-[rgba(132,42,42,0.12)] text-[#8d2d2d]",
  high: "bg-[rgba(159,107,44,0.14)] text-[#87511c]",
  medium: "bg-[rgba(41,88,110,0.12)] text-[#28505d]",
  low: "bg-[rgba(34,57,81,0.08)] text-[#38506a]",
  bullish: "bg-[rgba(25,116,91,0.12)] text-[#126652]",
  bearish: "bg-[rgba(163,54,54,0.12)] text-[#963636]",
  mixed: "bg-[rgba(105,84,38,0.12)] text-[#6c5724]",
  pending: "bg-[rgba(54,75,116,0.12)] text-[#38507c]",
  outline:
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-muted)]",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] sm:text-[11px] sm:tracking-[0.12em] uppercase",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
