import { AppShell } from "@/components/layout/app-shell";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { getViewerOrGuest } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ResearchDataset } from "@/types/research";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerOrGuest();
  let initialDataset: ResearchDataset | null = null;

  try {
    initialDataset = await fetchResearchDataset(createServiceRoleSupabaseClient());
  } catch {
    initialDataset = null;
  }

  return (
    <AppShell viewer={viewer} initialDataset={initialDataset}>
      {children}
    </AppShell>
  );
}
