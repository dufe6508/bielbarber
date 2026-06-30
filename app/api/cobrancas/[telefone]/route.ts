import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cobrancas/[telefone] — cobrança em aberto + histórico do cliente.
// Sem login (busca por telefone, como o resto da área do cliente).
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
    select: { id: true, nome: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  // Só mensalidade: pacote/pedido/agendamento têm fluxo de pagamento próprio.
  const cobrancas = await prisma.subscriptionCharge.findMany({
    where: { clienteId: cliente.id, tipo: "mensalista" },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  // Cobrança em aberto = pendente ou vencido (uma por vez no fluxo atual).
  const aberta = cobrancas.find(
    (c) => c.status === "pendente" || c.status === "vencido"
  );

  return NextResponse.json({
    nome: cliente.nome,
    aberta: aberta
      ? {
          id: aberta.id,
          valor: aberta.valor,
          status: aberta.status,
          vencimento: aberta.vencimento,
          descricao: aberta.descricao,
          itens: aberta.itens,
          temCheckout: Boolean(aberta.mpInitPoint),
        }
      : null,
    historico: cobrancas.map((c) => ({
      id: c.id,
      valor: c.valor,
      status: c.status,
      vencimento: c.vencimento,
      metodo: c.metodo,
      pagoEm: c.pagoEm,
      comprovanteUrl: c.comprovanteUrl,
      criadoEm: c.criadoEm,
    })),
  });
}
