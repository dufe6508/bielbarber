import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { telefoneNumeros } from "@/lib/utils/format";

// Próxima data de fechamento a partir do dia de cobrança (10 ou 30).
function proximaCobranca(dia: number, ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), dia);
  if (d <= ref) d.setMonth(d.getMonth() + 1);
  return d;
}

// GET — mensalistas com total do ciclo calculado ao vivo (agendamentos pendentes).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const subs = await prisma.subscription.findMany({
    include: { cliente: true },
    orderBy: { diaCobranca: "asc" },
  });

  const resultado = await Promise.all(
    subs.map(async (s) => {
      const pend = await prisma.appointment.findMany({
        where: {
          clienteId: s.clienteId,
          statusPagamento: "pendente",
          status: { in: ["agendado", "concluido"] },
        },
        select: { valorTotal: true },
      });
      const totalCiclo = pend.reduce((acc, a) => acc + Number(a.valorTotal), 0);
      const vencido =
        totalCiclo > 0 &&
        s.proximaCobranca != null &&
        new Date(s.proximaCobranca) < new Date();
      const estado: "pago" | "pendente" | "vencido" =
        totalCiclo === 0 ? "pago" : vencido ? "vencido" : "pendente";
      return {
        id: s.id,
        clienteId: s.clienteId,
        nome: s.cliente.nome,
        telefone: s.cliente.telefone,
        diaCobranca: s.diaCobranca,
        status: s.status,
        totalCiclo,
        atendimentosCiclo: pend.length,
        proximaCobranca: s.proximaCobranca,
        dataUltimoPagamento: s.dataUltimoPagamento,
        valorUltimoPagamento: s.valorUltimoPagamento,
        estado,
      };
    })
  );
  return NextResponse.json(resultado);
}

// POST — torna um cliente mensalista. Body: { telefone, nome?, diaCobranca }
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  const telefone = telefoneNumeros(String(b?.telefone ?? ""));
  const dia = Number(b?.diaCobranca);

  if (telefone.length < 10 || (dia !== 10 && dia !== 30)) {
    return NextResponse.json(
      { error: "Telefone válido e diaCobranca 10 ou 30 são obrigatórios" },
      { status: 400 }
    );
  }

  const cliente = await prisma.client.upsert({
    where: { telefone },
    update: b?.nome ? { nome: String(b.nome).slice(0, 80) } : {},
    create: { telefone, nome: b?.nome ? String(b.nome).slice(0, 80) : "Cliente" },
  });

  const sub = await prisma.subscription.upsert({
    where: { clienteId: cliente.id },
    update: { diaCobranca: dia, status: "ativo", proximaCobranca: proximaCobranca(dia) },
    create: {
      clienteId: cliente.id,
      diaCobranca: dia,
      status: "ativo",
      proximaCobranca: proximaCobranca(dia),
    },
  });
  return NextResponse.json(sub, { status: 201 });
}
