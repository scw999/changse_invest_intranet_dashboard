import { SignInForm } from "@/components/auth/sign-in-form";

function normalizeNextPath(next: string | undefined) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  return next;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-6 py-12">
      <section className="w-full rounded-[32px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_28px_80px_rgba(16,29,46,0.12)]">
        <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-faint)] uppercase">
          Private Access
        </p>
        <h1 className="mt-3 font-[family:var(--font-display)] text-4xl text-[var(--text-strong)]">
          창세인베스트 인트라 시스템 로그인
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
          이 앱은 비공개 리서치 시스템입니다. 관리자 허용 목록에 등록된 이메일로만 접근할 수
          있습니다.
        </p>

        <div className="mt-8">
          <SignInForm nextPath={normalizeNextPath(next)} />
        </div>
      </section>
    </main>
  );
}
