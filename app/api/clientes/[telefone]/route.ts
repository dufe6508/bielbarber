import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clientes/[telefone] — reconhecimento leve por telefone (sem login).
// Usado no passo de identificação: se já é cliente, devolve o nome pra pré-preencher.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ telefone: string }> }
) {
  const { telefone: bruto } = await params;
  const telefone = decodeURIComponent(bruto).replace(/\D/g, "");

  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }

  const cliente = await prisma.client.findUnique({
    where: { telefone },
    select: { nome: true, bloqueado: true, mensalidade: { select: { status: true } } },
  });

  if (!cliente) {
    return NextResponse.json({ encontrado: false });
  }

  return NextResponse.json({
    encontrado: true,
    nome: cliente.nome,
    mensalista: cliente.mensalidade?.status === "ativo",
  });
}
