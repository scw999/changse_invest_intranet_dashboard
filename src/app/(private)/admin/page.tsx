import { AdminPage } from "@/components/pages/admin-page";
import { requireAdminViewer } from "@/lib/auth/session";

export default async function AdminRoute() {
  await requireAdminViewer();
  return <AdminPage />;
}
