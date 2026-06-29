import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Deep-link /pacotes/<slug>: leva pra lista de pacotes focando o pacote.
// Slug desconhecido → volta pra /pacotes.
export default async function PacoteSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pacote = await prisma.package.findFirst({
    where: { slug, ativo: true },
    select: { slug: true },
  });
  redirect(pacote ? `/pacotes#${pacote.slug}` : "/pacotes");
}
