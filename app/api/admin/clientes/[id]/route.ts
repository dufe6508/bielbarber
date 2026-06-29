import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function dec(v: { toString(): string } | null | undefined): number {
  return v ? parseFloat(v.toString()) : 0;
}

// GET — perfil completo do cliente: dados, extrato de agendamentos, estatísticas
// e resumo financeiro. Tudo numa chamada (a sheet abre com um fetch só).
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const c = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      telefone: true,
      bloqueado: true,
      motivoBloqueio: true,
      vip: true,
      observacoes: true,
      podePagarLocal: true,
      criadoEm: true,
      mensalidade: {
        select: { id: true, status: true, diaCobranca: true, totalCicloAtual: true },
      },
      cobrancas: {
        where: { status: { in: ["pendente", "vencido"] } },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { id: true, valor: true, status: true, vencimento: true, descricao: true },
      },
      pacotesCliente: {
        where: { status: "ativo" },
        select: { pacote: { select: { nome: true } }, usosRestantes: true, expiraEm: true },
      },
      agendamentos: {
        orderBy: [{ data: "desc" }, { horarioInicio: "desc" }],
        select: {
          id: true,
          data: true,
          horarioInicio: true,
          status: true,
          statusPagamento: true,
          valorTotal: true,
          servicos: { select: { servico: { select: { nome: true } } } },
        },
      },
    },
  });

  if (!c) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const ags = c.agendamentos;
  const concluidos = ags.filter((a) => a.status === "concluido");
  const totalCortes = concluidos.length;
  const totalGasto = concluidos.reduce((s, a) => s + dec(a.valorTotal), 0);
  const ticketMedio = totalCortes ? totalGasto / totalCortes : 0;

  // Datas dos cortes concluídos (mais novo primeiro já que ags vem desc).
  const datas = concluidos.map((a) => a.data.getTime());
  const ultimoCorte = datas.length ? Math.max(...datas) : null;
  const dia = 86_400_000;
  const diasSemVoltar =
    ultimoCorte != null ? Math.floor((Date.now() - ultimoCorte) / dia) : null;
  // Frequência média = média de dias entre cortes consecutivos.
  let freqMediaDias: number | null = null;
  if (datas.length >= 2) {
    const ord = [...datas].sort((a, b) => a - b);
    let soma = 0;
    for (let i = 1; i < ord.length; i++) soma += ord[i] - ord[i - 1];
    freqMediaDias = Math.round(soma / (ord.length - 1) / dia);
  }

  return NextResponse.json({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    bloqueado: c.bloqueado,
    motivoBloqueio: c.motivoBloqueio,
    vip: c.vip,
    observacoes: c.observacoes,
    podePagarLocal: c.podePagarLocal,
    criadoEm: c.criadoEm.toISOString(),
    mensalidade: c.mensalidade
      ? {
          id: c.mensalidade.id,
          status: c.mensalidade.status,
          diaCobranca: c.mensalidade.diaCobranca,
          totalCicloAtual: dec(c.mensalidade.totalCicloAtual),
        }
      : null,
    cobrancaAberta: c.cobrancas[0]
      ? {
          id: c.cobrancas[0].id,
          valor: dec(c.cobrancas[0].valor),
          status: c.cobrancas[0].status,
          vencimento: c.cobrancas[0].vencimento.toISOString().slice(0, 10),
          descricao: c.cobrancas[0].descricao,
        }
      : null,
    assinaturas: c.pacotesCliente.map((p) => ({
      nome: p.pacote.nome,
      usosRestantes: p.usosRestantes,
      expiraEm: p.expiraEm?.toISOString() ?? null,
    })),
    stats: {
      totalCortes,
      totalGasto,
      ticketMedio,
      ultimoCorte: ultimoCorte != null ? new Date(ultimoCorte).toISOString().slice(0, 10) : null,
      diasSemVoltar,
      freqMediaDias,
    },
    agendamentos: ags.map((a) => ({
      id: a.id,
      data: a.data.toISOString().slice(0, 10),
      horarioInicio: a.horarioInicio,
      status: a.status,
      statusPagamento: a.statusPagamento,
      valorTotal: dec(a.valorTotal),
      servicos: a.servicos.map((s) => s.servico.nome),
    })),
  });
}

// PATCH — atualiza controles do cliente. Campos opcionais; só os enviados mudam.
// { bloqueado?, motivoBloqueio?, vip?, observacoes? }
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof b.bloqueado === "boolean") {
    data.bloqueado = b.bloqueado;
    // Ao desbloquear, limpa o motivo.
    data.motivoBloqueio = b.bloqueado
      ? typeof b.motivoBloqueio === "string"
        ? b.motivoBloqueio.slice(0, 240) || null
        : null
      : null;
  }
  if (typeof b.vip === "boolean") data.vip = b.vip;
  if (typeof b.observacoes === "string") {
    data.observacoes = b.observacoes.slice(0, 500).trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const cliente = await prisma.client.update({
    where: { id },
    data,
    select: { id: true, bloqueado: true, motivoBloqueio: true, vip: true, observacoes: true },
  });
  return NextResponse.json(cliente);
}
