import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Deep-link /loja/<slug>: leva pra loja focando o produto (âncora #slug).
// Slug desconhecido → volta pra loja.
export default async function LojaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produto = await prisma.product.findFirst({
    where: { slug, ativo: true },
    select: { slug: true },
  });
  redirect(produto ? `/loja#${produto.slug}` : "/loja");
}
