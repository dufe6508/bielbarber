import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — todos os serviços (inclui inativos), ordenados.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const servicos = await prisma.service.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(servicos);
}

// POST — cria serviço.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b?.nome || typeof b.preco !== "number") {
    return NextResponse.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }
  const servico = await prisma.service.create({
    data: {
      nome: String(b.nome).slice(0, 80),
      descricao: b.descricao ? String(b.descricao).slice(0, 240) : null,
      preco: b.preco,
      duracaoMinutos: Number(b.duracaoMinutos) || 30,
      slotsNecessarios: Math.max(1, Number(b.slotsNecessarios) || 1),
      capacidadePorSlot: Math.max(1, Number(b.capacidadePorSlot) || 1),
      ativo: b.ativo ?? true,
      ordem: Number(b.ordem) || 0,
    },
  });
  return NextResponse.json(servico, { status: 201 });
}
