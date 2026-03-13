import { AppShell } from "@/components/layout/app-shell";
import { getViewerOrGuest } from "@/lib/auth/session";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerOrGuest();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
