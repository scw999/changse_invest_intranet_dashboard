"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  return next;
}

function readHashParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

export function AuthCallbackClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 정보를 확인하는 중입니다.");

  useEffect(() => {
    let isCancelled = false;

    async function completeSignIn() {
      const nextPath = normalizeNextPath(searchParams.get("next"));
      const code = searchParams.get("code");
      const hashParams = readHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
        } else if (type !== "magiclink") {
          setMessage("로그인 링크 정보가 올바르지 않습니다. 다시 요청해 주세요.");
          return;
        }

        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        if (!isCancelled) {
          setMessage("로그인 완료. 대시보드로 이동합니다.");
          router.replace(nextPath);
          router.refresh();
        }
      } catch (error) {
        if (!isCancelled) {
          const nextMessage =
            error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.";
          setMessage(nextMessage);
        }
      }
    }

    void completeSignIn();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams, supabase]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] items-center px-6 py-12">
      <section className="w-full rounded-[32px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_28px_80px_rgba(16,29,46,0.12)]">
        <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-faint)] uppercase">
          Auth Callback
        </p>
        <h1 className="mt-3 font-[family:var(--font-display)] text-3xl text-[var(--text-strong)]">
          로그인 처리 중
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{message}</p>
      </section>
    </main>
  );
}
