import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { janelaMes, janelaData } from "@/lib/admin/metrics";

type Item = { nome: string; sub?: string; valor?: number; qtd?: number };

function parseMes(mes: string | null): { ano: number; mesIndex: number } {
  const agora = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { ano: a, mesIndex: m - 1 };
  }
  return { ano: agora.getFullYear(), mesIndex: agora.getMonth() };
}

const dec = (v: { toString(): string } | null) => (v ? parseFloat(v.toString()) : 0);

// GET — lista detalhada de uma fonte do financeiro num mês.
// ?tipo=loja|assinaturas|cancelamentos|clientes_novos|servicos|mensalistas&mes=YYYY-MM
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  const { ano, mesIndex } = parseMes(url.searchParams.get("mes"));
  const { desde, ate } = janelaMes(ano, mesIndex);
  const jd = janelaData(desde); // janela UTC p/ filtrar Appointment.data (dia do corte)

  let titulo = "";
  let itens: Item[] = [];

  if (tipo === "loja") {
    titulo = "Produtos vendidos";
    const linhas = await prisma.orderItem.findMany({
      where: { pedido: { statusPagamento: "pago", criadoEm: { gte: desde, lt: ate } } },
      select: { quantidade: true, precoNaHora: true, produto: { select: { nome: true } } },
    });
    const mapa = new Map<string, { qtd: number; valor: number }>();
    for (const l of linhas) {
      const e = mapa.get(l.produto.nome) ?? { qtd: 0, valor: 0 };
      e.qtd += l.quantidade;
      e.valor += dec(l.precoNaHora) * l.quantidade;
      mapa.set(l.produto.nome, e);
    }
    itens = Array.from(mapa.entries())
      .map(([nome, v]) => ({ nome, sub: `${v.qtd} un.`, valor: v.valor, qtd: v.qtd }))
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  } else if (tipo === "servicos") {
    titulo = "Serviços realizados";
    const linhas = await prisma.appointmentService.findMany({
      where: {
        agendamento: { status: "concluido", data: { gte: jd.desde, lt: jd.ate } },
      },
      select: { precoNaHora: true, servico: { select: { nome: true } } },
    });
    const mapa = new Map<string, { qtd: number; valor: number }>();
    for (const l of linhas) {
      const e = mapa.get(l.servico.nome) ?? { qtd: 0, valor: 0 };
      e.qtd += 1;
      e.valor += dec(l.precoNaHora);
      mapa.set(l.servico.nome, e);
    }
    itens = Array.from(mapa.entries())
      .map(([nome, v]) => ({ nome, sub: `${v.qtd}x`, valor: v.valor, qtd: v.qtd }))
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  } else if (tipo === "assinaturas") {
    titulo = "Assinaturas vendidas";
    const linhas = await prisma.clientPackage.findMany({
      where: { compradoEm: { gte: desde, lt: ate } },
      select: {
        compradoEm: true,
        cliente: { select: { nome: true } },
        pacote: { select: { nome: true, preco: true } },
      },
      orderBy: { compradoEm: "desc" },
    });
    itens = linhas.map((l) => ({
      nome: l.cliente.nome,
      sub: l.pacote.nome,
      valor: dec(l.pacote.preco),
    }));
  } else if (tipo === "mensalistas") {
    titulo = "Pagamentos de mensalistas";
    const linhas = await prisma.subscription.findMany({
      where: { dataUltimoPagamento: { gte: desde, lt: ate } },
      select: {
        valorUltimoPagamento: true,
        diaCobranca: true,
        cliente: { select: { nome: true } },
      },
    });
    itens = linhas.map((l) => ({
      nome: l.cliente.nome,
      sub: `Fecha dia ${l.diaCobranca}`,
      valor: dec(l.valorUltimoPagamento),
    }));
  } else if (tipo === "cancelamentos") {
    titulo = "Cancelamentos";
    const linhas = await prisma.appointment.findMany({
      where: { status: "cancelado", data: { gte: jd.desde, lt: jd.ate } },
      select: {
        data: true,
        horarioInicio: true,
        valorTotal: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { data: "desc" },
    });
    itens = linhas.map((l) => ({
      nome: l.cliente.nome,
      sub: `${l.data.toISOString().slice(0, 10)} · ${l.horarioInicio}`,
      valor: dec(l.valorTotal),
    }));
  } else if (tipo === "clientes_novos") {
    titulo = "Clientes novos";
    const linhas = await prisma.client.findMany({
      where: { criadoEm: { gte: desde, lt: ate } },
      select: { nome: true, telefone: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    });
    itens = linhas.map((l) => ({
      nome: l.nome,
      sub: l.telefone,
    }));
  } else {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const total = itens.reduce((s, i) => s + (i.valor ?? 0), 0);
  return NextResponse.json({ titulo, total, itens });
}
