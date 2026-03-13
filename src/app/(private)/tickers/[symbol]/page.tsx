import { TickerDetailPage } from "@/components/pages/ticker-detail-page";

export default async function TickerDetailRoute({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;

  return <TickerDetailPage symbol={symbol} />;
}
