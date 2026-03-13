import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/session";

export async function requireAdminRouteRequest(request: Request) {
  const viewer = await getViewer();
  const requestUrl = new URL(request.url);

  if (!viewer) {
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("next", requestUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (!viewer.isAdmin) {
    return NextResponse.redirect(new URL("/auth/access-denied", request.url));
  }

  return null;
}
