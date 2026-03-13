export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-6 py-12">
      <section className="w-full rounded-[32px] border border-[rgba(140,45,45,0.12)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_28px_80px_rgba(16,29,46,0.12)]">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8d2d2d] uppercase">
          Access Denied
        </p>
        <h1 className="mt-3 font-[family:var(--font-display)] text-4xl text-[var(--text-strong)]">
          허용되지 않은 계정입니다.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
          현재 로그인한 이메일이 관리자 허용 목록에 없습니다. 소유자 계정으로 다시 로그인해
          주세요.
        </p>

        <form action="/auth/sign-out" method="post" className="mt-8">
          <button
            type="submit"
            className="rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            다른 계정으로 다시 로그인
          </button>
        </form>
      </section>
    </main>
  );
}
