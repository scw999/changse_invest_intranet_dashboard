import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/auth/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppViewer = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export async function getViewer() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    isAdmin: isAdminEmail(user.email),
  } satisfies AppViewer;
}

export async function requirePrivateViewer() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/auth/sign-in");
  }

  if (!viewer.isAdmin) {
    redirect("/auth/access-denied");
  }

  return viewer;
}
