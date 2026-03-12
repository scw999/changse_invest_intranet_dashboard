import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[0_24px_80px_rgba(16,29,46,0.08)] backdrop-blur-sm sm:p-5 md:rounded-[28px] md:p-6",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? (
              <h2 className="font-[family:var(--font-display)] text-[1.65rem] leading-tight text-[var(--text-strong)] sm:text-2xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
