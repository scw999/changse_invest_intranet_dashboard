"use client";

import { useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("loading");
        setMessage("");

        const redirectTo = new URL("/auth/callback", window.location.origin);
        redirectTo.searchParams.set("next", nextPath);

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectTo.toString(),
          },
        });

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        setStatus("sent");
        setMessage("로그인 링크를 이메일로 보냈습니다. 같은 브라우저에서 이어서 진행해 주세요.");
      }}
    >
      <label className="block space-y-2">
        <span className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
          Admin Email
        </span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
          className="field"
        />
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "링크 전송 중..." : "이메일 로그인 링크 받기"}
      </button>

      {message ? (
        <p
          className={`text-sm ${
            status === "error" ? "text-[#8d2d2d]" : "text-[var(--text-muted)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
