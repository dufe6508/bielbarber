import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clientes/[telefone]/historico — histórico do cliente por telefone (sem login)
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
    include: {
      agendamentos: {
        include: { servicos: { include: { servico: true } } },
        orderBy: [{ data: "desc" }, { horarioInicio: "desc" }],
      },
    },
  });

  if (!cliente) {
    return NextResponse.json(
      { error: "Nenhum cliente encontrado com esse telefone." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    nome: cliente.nome,
    agendamentos: cliente.agendamentos.map((a) => ({
      id: a.id,
      data: a.data,
      horarioInicio: a.horarioInicio,
      status: a.status,
      statusPagamento: a.statusPagamento,
      valorTotal: a.valorTotal,
      servicos: a.servicos.map((s) => ({
        nome: s.servico.nome,
        preco: s.precoNaHora,
      })),
    })),
  });
}
