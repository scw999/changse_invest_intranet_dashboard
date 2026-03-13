import { ThemeDetailPage } from "@/components/pages/theme-detail-page";

export default async function ThemeDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ThemeDetailPage slug={slug} />;
}
