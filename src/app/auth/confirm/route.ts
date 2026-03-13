import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=missing_token", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
