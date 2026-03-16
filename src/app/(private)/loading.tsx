export default function PrivateLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          리서치 데이터를 불러오는 중입니다...
        </p>
      </div>
    </div>
  );
}
