import { requireAdmin } from "@/lib/auth";
import { getPerfil } from "@/lib/perfil";
import { QueryProvider } from "@/components/QueryProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const perfil = await getPerfil();
  return (
    <QueryProvider>
      <AdminShell perfil={perfil}>{children}</AdminShell>
    </QueryProvider>
  );
}
