import { Suspense } from "react";

import { AuthCallbackClient } from "@/components/auth/auth-callback-client";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-6 py-12">
          <section className="w-full rounded-[32px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_28px_80px_rgba(16,29,46,0.12)]">
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-faint)] uppercase">
              Auth Callback
            </p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-3xl text-[var(--text-strong)]">
              로그인 처리 중
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
              로그인 정보를 확인하는 중입니다.
            </p>
          </section>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
