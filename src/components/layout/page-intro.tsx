import { Badge } from "@/components/ui/badge";

type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  meta?: string;
  children?: React.ReactNode;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  meta,
  children,
}: PageIntroProps) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(242,235,224,0.8))] p-5 shadow-[0_28px_90px_rgba(16,29,46,0.08)] sm:p-6 md:rounded-[32px] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <Badge variant="outline">{eyebrow}</Badge> : null}
          <h1 className="mt-4 font-[family:var(--font-display)] text-[2.05rem] leading-[1.03] text-[var(--text-strong)] sm:text-[2.55rem] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] md:text-base">
            {description}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[180px]">
          {meta ? <p className="text-sm font-medium text-[var(--text-faint)]">{meta}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
