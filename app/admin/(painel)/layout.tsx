import { requireAdmin } from "@/lib/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="flex min-h-screen">{children}</div>;
}
