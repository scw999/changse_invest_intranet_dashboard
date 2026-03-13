import { AppShell } from "@/components/layout/app-shell";
import { requirePrivateViewer } from "@/lib/auth/session";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requirePrivateViewer();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
