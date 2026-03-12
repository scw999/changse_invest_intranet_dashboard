type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[rgba(255,255,255,0.55)] p-8 text-center">
      <h3 className="font-[family:var(--font-display)] text-2xl text-[var(--text-strong)]">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}
