import { NewsDetailPage } from "@/components/pages/news-detail-page";

export default async function NewsDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NewsDetailPage id={id} />;
}
