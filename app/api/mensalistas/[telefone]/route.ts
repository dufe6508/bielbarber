import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/mensalistas/[telefone] — ciclo atual do mensalista (sem login)
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
      mensalidade: true,
      agendamentos: {
        where: {
          statusPagamento: "pendente",
          status: { in: ["agendado", "concluido"] },
        },
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

  if (!cliente.mensalidade || cliente.mensalidade.status === "inativo") {
    return NextResponse.json({ mensalista: false, nome: cliente.nome });
  }

  const agendamentos = cliente.agendamentos.map((a) => ({
    id: a.id,
    data: a.data,
    horarioInicio: a.horarioInicio,
    status: a.status,
    valorTotal: a.valorTotal,
    servicos: a.servicos.map((s) => ({
      nome: s.servico.nome,
      preco: s.precoNaHora,
    })),
  }));

  const total = agendamentos.reduce((acc, a) => acc + Number(a.valorTotal), 0);

  return NextResponse.json({
    mensalista: true,
    nome: cliente.nome,
    diaCobranca: cliente.mensalidade.diaCobranca,
    proximaCobranca: cliente.mensalidade.proximaCobranca,
    agendamentos,
    total,
  });
}
