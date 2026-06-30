import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pacotesAtivosDoCliente } from "@/lib/packages";

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

  const saldos = await pacotesAtivosDoCliente(cliente.id);

  return NextResponse.json({
    nome: cliente.nome,
    pacotes: saldos.map((s) => ({
      nome: s.pacoteNome,
      usosTotais: s.usosTotais,
      usosRestantes: s.usosRestantes,
      expiraEm: s.expiraEm?.toISOString() ?? null,
      status: s.status,
      diasParaVencer: s.diasParaVencer,
      limiteSemanal: s.limiteSemanal,
      usosNaSemana: s.usosNaSemana,
      bloqueado: s.bloqueado,
    })),
    agendamentos: cliente.agendamentos.map((a) => ({
      id: a.id,
      data: a.data,
      horarioInicio: a.horarioInicio,
      status: a.status,
      statusPagamento: a.statusPagamento,
      valorTotal: a.valorTotal,
      rating: a.rating,
      checkinEm: a.checkinEm,
      servicos: a.servicos.map((s) => ({
        nome: s.servico.nome,
        preco: s.precoNaHora,
      })),
    })),
  });
}
