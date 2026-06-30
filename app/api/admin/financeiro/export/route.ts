import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idsAgendamentoPacote } from "@/lib/admin/metrics";

// GET ?de=YYYY-MM-DD&ate=YYYY-MM-DD → CSV com lançamentos do período:
// agendamentos concluídos, pedidos pagos e pagamentos de mensalistas.
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const de = sp.get("de");
  const ate = sp.get("ate");
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!de || !ate || !re.test(de) || !re.test(ate)) {
    return new Response("Parâmetros de/ate inválidos (YYYY-MM-DD)", { status: 400 });
  }

  const desde = new Date(`${de}T00:00:00.000Z`);
  const fim = new Date(`${ate}T00:00:00.000Z`);
  fim.setUTCDate(fim.getUTCDate() + 1); // inclui o dia final inteiro

  const idsPacote = await idsAgendamentoPacote();
  const [ags, pedidos, pacotes, subs] = await Promise.all([
    prisma.appointment.findMany({
      // Só serviço avulso — mensalista/pacote entram nas próprias linhas.
      where: {
        status: "concluido",
        data: { gte: desde, lt: fim },
        cliente: { mensalidade: { is: null } },
        ...(idsPacote.length ? { id: { notIn: idsPacote } } : {}),
      },
      select: {
        data: true,
        valorTotal: true,
        cliente: { select: { nome: true } },
        servicos: { include: { servico: { select: { nome: true } } } },
      },
      orderBy: { data: "asc" },
    }),
    prisma.order.findMany({
      where: { statusPagamento: "pago", criadoEm: { gte: desde, lt: fim } },
      select: {
        criadoEm: true,
        total: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.clientPackage.findMany({
      where: { compradoEm: { gte: desde, lt: fim } },
      select: {
        compradoEm: true,
        cliente: { select: { nome: true } },
        pacote: { select: { nome: true, preco: true } },
      },
    }),
    prisma.subscription.findMany({
      where: { dataUltimoPagamento: { gte: desde, lt: fim } },
      select: {
        dataUltimoPagamento: true,
        valorUltimoPagamento: true,
        cliente: { select: { nome: true } },
      },
    }),
  ]);

  const dec = (v: { toString(): string } | null) => (v ? v.toString() : "0");
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  // Escapa aspas/; conforme CSV; envolve sempre em aspas por segurança.
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

  type Linha = [string, string, string, string, string]; // data, tipo, cliente, descricao, valor
  const linhas: Linha[] = [];

  for (const a of ags) {
    linhas.push([
      dia(a.data),
      "Serviço",
      a.cliente.nome,
      a.servicos.map((s) => s.servico.nome).join(" + ") || "Atendimento",
      dec(a.valorTotal),
    ]);
  }
  for (const p of pedidos) {
    linhas.push([dia(p.criadoEm), "Loja", p.cliente.nome, "Pedido", dec(p.total)]);
  }
  for (const a of pacotes) {
    linhas.push([dia(a.compradoEm), "Assinatura", a.cliente.nome, a.pacote.nome, dec(a.pacote.preco)]);
  }
  for (const s of subs) {
    linhas.push([
      s.dataUltimoPagamento ? dia(s.dataUltimoPagamento) : "",
      "Mensalista",
      s.cliente.nome,
      "Fechamento de ciclo",
      dec(s.valorUltimoPagamento),
    ]);
  }
  linhas.sort((a, b) => a[0].localeCompare(b[0]));

  const total = linhas.reduce((sum, l) => sum + parseFloat(l[4] || "0"), 0);
  const header = ["Data", "Tipo", "Cliente", "Descrição", "Valor (R$)"];
  const corpo = [
    header.map(esc).join(";"),
    ...linhas.map((l) => l.map(esc).join(";")),
    "", // linha em branco antes do total
    ["", "", "", "TOTAL", total.toFixed(2)].map(esc).join(";"),
  ].join("\r\n");

  // BOM para o Excel reconhecer UTF-8 (acentos).
  const csv = "﻿" + corpo;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro_${de}_${ate}.csv"`,
    },
  });
}
