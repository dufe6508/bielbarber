import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Deep-link /agendar/<slug>: leva pro fluxo de booking (home) com o serviço
// pré-selecionado via querystring. Slug desconhecido → volta pra home.
// ponytail: a home (`app/(cliente)/page.tsx` → BookingStepper) é do Agent C;
// aqui só passo `?servico=<slug>`. Agent C lê esse param e marca o serviço.
export default async function AgendarSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const servico = await prisma.service.findFirst({
    where: { slug, ativo: true },
    select: { slug: true },
  });
  redirect(servico ? `/?servico=${servico.slug}` : "/");
}
