"use client";

import { useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 90;
const RESEND_STORAGE_KEY = "changse-auth-last-sent-at";

function readCooldownRemaining() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(RESEND_STORAGE_KEY);
  if (!rawValue) {
    return 0;
  }

  const lastSentAt = Number(rawValue);
  if (!Number.isFinite(lastSentAt)) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

function formatAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "이메일 전송 한도를 잠시 초과했습니다. 잠깐 기다린 뒤 다시 시도해 주세요.";
  }

  if (normalized.includes("for security purposes")) {
    return "보안 제한으로 인해 잠시 후 다시 시도해야 합니다.";
  }

  return message;
}

export function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(() => readCooldownRemaining());

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownRemaining(readCooldownRemaining());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const isDisabled = status === "loading" || cooldownRemaining > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();

        if (cooldownRemaining > 0) {
          setStatus("error");
          setMessage(`잠시 후 다시 시도해 주세요. 약 ${cooldownRemaining}초 남았습니다.`);
          return;
        }

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
          setMessage(formatAuthError(error.message));
          return;
        }

        window.sessionStorage.setItem(RESEND_STORAGE_KEY, String(Date.now()));
        setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
        setStatus("sent");
        setMessage("로그인 링크를 이메일로 보냈습니다. 같은 브라우저에서 메일 링크를 열어 주세요.");
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
        disabled={isDisabled}
        className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading"
          ? "링크 전송 중..."
          : cooldownRemaining > 0
            ? `${cooldownRemaining}초 후 재시도`
            : "이메일 로그인 링크 받기"}
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
