import { TickerDetailPage } from "@/components/pages/ticker-detail-page";
import { fetchResearchDataset } from "@/lib/supabase/research";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ResearchDataset } from "@/types/research";

export default async function TickerDetailRoute({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  let fallbackDataset: ResearchDataset | null = null;

  try {
    fallbackDataset = await fetchResearchDataset(createServiceRoleSupabaseClient());
  } catch {
    fallbackDataset = null;
  }

  return <TickerDetailPage symbol={symbol} fallbackDataset={fallbackDataset} />;
}
