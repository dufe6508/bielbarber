import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { telefoneNumeros } from "@/lib/utils/format";
import { criarCobrancaPacote } from "@/lib/billing/charges";

// POST — cliente inicia a compra de um pacote pelo site. Zero fricção: nome +
// telefone, sem senha. Cria/reaproveita o cliente e emite uma cobrança pendente.
// O pacote só é ativado depois que o pagamento confirma (cartão na hora; Pix via
// webhook) — ver confirmarPagamento/confirmarPacote.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.pacoteId || !body?.nome || !body?.telefone) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const telefone = telefoneNumeros(String(body.telefone));
  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }

  const pacote = await prisma.package.findFirst({
    where: { id: String(body.pacoteId), ativo: true },
    select: { id: true, nome: true },
  });
  if (!pacote) {
    return NextResponse.json({ error: "Pacote indisponível." }, { status: 404 });
  }

  const cliente = await prisma.client.upsert({
    where: { telefone },
    update: { nome: String(body.nome).slice(0, 80) },
    create: { nome: String(body.nome).slice(0, 80), telefone },
    select: { id: true, bloqueado: true },
  });
  if (cliente.bloqueado) {
    return NextResponse.json(
      { error: "Não foi possível continuar. Fale com a barbearia." },
      { status: 403 }
    );
  }

  const charge = await criarCobrancaPacote(cliente.id, pacote.id);

  return NextResponse.json({
    chargeId: charge.id,
    pacote: pacote.nome,
    valor: Number(charge.valor),
  });
}
