import { requireAdmin } from "@/lib/auth";
import { QueryProvider } from "@/components/QueryProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <QueryProvider>
      <AdminShell>{children}</AdminShell>
    </QueryProvider>
  );
}
