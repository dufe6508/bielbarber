import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { telefoneNumeros } from "@/lib/utils/format";
import { criarCobrancaPedido } from "@/lib/billing/charges";

// POST — cria um pedido de produtos + cobrança integrada.
// Body: { nome, telefone, itens: [{ produtoId, quantidade }] }
// Retorna { pedidoId, chargeId, valor } para o checkout.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.nome || !body?.telefone || !Array.isArray(body?.itens) || body.itens.length === 0) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const telefone = telefoneNumeros(String(body.telefone));
  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }

  // Upsert cliente
  const cliente = await prisma.client.upsert({
    where: { telefone },
    update: { nome: String(body.nome).slice(0, 80) },
    create: { nome: String(body.nome).slice(0, 80), telefone },
    select: { id: true, bloqueado: true },
  });
  if (cliente.bloqueado) {
    return NextResponse.json({ error: "Não foi possível continuar. Fale com a barbearia." }, { status: 403 });
  }

  // Valida os itens e busca produtos em uma query
  const ids = (body.itens as { produtoId: string; quantidade: number }[]).map((i) => i.produtoId);
  const produtos = await prisma.product.findMany({
    where: { id: { in: ids }, ativo: true },
    select: { id: true, nome: true, preco: true, quantidadeEstoque: true },
  });

  if (produtos.length === 0) {
    return NextResponse.json({ error: "Nenhum produto válido encontrado." }, { status: 400 });
  }

  const produtoMap = new Map(produtos.map((p) => [p.id, p]));

  // Valida estoque e monta itens
  type ItemPedido = { produtoId: string; quantidade: number; precoNaHora: number; nome: string };
  const itensPedido: ItemPedido[] = [];
  for (const item of body.itens as { produtoId: string; quantidade: number }[]) {
    const produto = produtoMap.get(item.produtoId);
    if (!produto) continue;
    const qtd = Number(item.quantidade);
    if (!qtd || qtd <= 0) continue;
    if (produto.quantidadeEstoque < qtd) {
      return NextResponse.json(
        { error: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidadeEstoque}` },
        { status: 409 }
      );
    }
    itensPedido.push({
      produtoId: produto.id,
      quantidade: qtd,
      precoNaHora: Number(produto.preco),
      nome: produto.nome,
    });
  }

  if (itensPedido.length === 0) {
    return NextResponse.json({ error: "Nenhum item válido." }, { status: 400 });
  }

  const total = itensPedido.reduce((s, i) => s + i.precoNaHora * i.quantidade, 0);

  // Cria pedido + itens + desconta estoque em transação
  const pedido = await prisma.$transaction(async (tx) => {
    const novo = await tx.order.create({
      data: {
        clienteId: cliente.id,
        total,
        itens: {
          create: itensPedido.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoNaHora: i.precoNaHora,
          })),
        },
      },
      select: { id: true },
    });
    // Desconta estoque
    for (const item of itensPedido) {
      await tx.product.update({
        where: { id: item.produtoId },
        data: { quantidadeEstoque: { decrement: item.quantidade } },
      });
    }
    return novo;
  });

  // Cria cobrança vinculada ao pedido
  const charge = await criarCobrancaPedido(cliente.id, pedido.id, total, itensPedido.map((i) => i.nome).join(", "));

  return NextResponse.json({
    pedidoId: pedido.id,
    chargeId: charge.id,
    valor: total,
  });
}
