import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clientes/[telefone]/ultimo-corte
// Último agendamento concluído do cliente — base do "Repetir Último Corte".
// Retorna os serviços (id + nome) para pré-popular o booking. Sem login.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ telefone: string }> }
) {
  const { telefone: bruto } = await params;
  const telefone = decodeURIComponent(bruto).replace(/\D/g, "");

  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }

  const ultimo = await prisma.appointment.findFirst({
    where: { cliente: { telefone }, status: "concluido" },
    orderBy: [{ data: "desc" }, { horarioInicio: "desc" }],
    include: { servicos: { include: { servico: true } } },
  });

  if (!ultimo) {
    return NextResponse.json({ encontrado: false });
  }

  // Só serviços ainda ativos podem ser reagendados.
  const servicos = ultimo.servicos
    .filter((s) => s.servico.ativo)
    .map((s) => ({
      id: s.servico.id,
      nome: s.servico.nome,
      preco: Number(s.servico.preco),
      slotsNecessarios: s.servico.slotsNecessarios,
    }));

  if (servicos.length === 0) {
    return NextResponse.json({ encontrado: false });
  }

  return NextResponse.json({ encontrado: true, data: ultimo.data, servicos });
}
