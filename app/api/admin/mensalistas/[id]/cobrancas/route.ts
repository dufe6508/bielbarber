import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitirCobranca } from "@/lib/billing/charges";

type Ctx = { params: Promise<{ id: string }> };

// GET — histórico de cobranças do mensalista (mais recentes primeiro).
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const cobrancas = await prisma.subscriptionCharge.findMany({
    where: { mensalistaId: id },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(cobrancas);
}

// POST — emite cobrança manual imediata (mesmo fora da data de fechamento).
// Body opcional: { forcar?: boolean } para gerar nova mesmo havendo uma aberta.
export async function POST(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => ({}));

  try {
    const charge = await emitirCobranca(id, { manual: true, forcar: Boolean(b?.forcar) });
    if (!charge) {
      return NextResponse.json(
        { error: "Nada a cobrar neste ciclo." },
        { status: 400 }
      );
    }
    return NextResponse.json(charge, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao emitir cobrança";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
