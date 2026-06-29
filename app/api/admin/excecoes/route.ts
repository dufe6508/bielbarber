import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_HORARIOS } from "@/lib/utils/slots";

// GET — lista exceções futuras (a partir de hoje).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const excecoes = await prisma.scheduleException.findMany({
    where: { data: { gte: hoje } },
    orderBy: { data: "asc" },
  });
  return NextResponse.json(excecoes);
}

// POST — cria/atualiza exceção de uma data.
// Body: { data:"YYYY-MM-DD", tipo:"fechado"|"horarios", horarios?:string[], motivo?:string }
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const data = body?.data;
  const tipo = body?.tipo;

  if (
    typeof data !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    (tipo !== "fechado" && tipo !== "horarios")
  ) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const horarios =
    tipo === "horarios" && Array.isArray(body.horarios)
      ? Array.from(new Set(body.horarios as string[]))
          .filter((h) => GRADE_HORARIOS.includes(h))
          .sort()
      : [];

  const motivo = typeof body.motivo === "string" ? body.motivo.slice(0, 120) : null;

  const excecao = await prisma.scheduleException.upsert({
    where: { data: new Date(data) },
    update: { tipo, horarios, motivo },
    create: { data: new Date(data), tipo, horarios, motivo },
  });
  revalidateTag(`slots-${data}`, {});
  return NextResponse.json(excecao);
}

// DELETE — remove exceção. Body: { data:"YYYY-MM-DD" }
export async function DELETE(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const data = body?.data;
  if (typeof data !== "string") {
    return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
  }
  await prisma.scheduleException
    .delete({ where: { data: new Date(data) } })
    .catch(() => null);
  revalidateTag(`slots-${data}`, {});
  return NextResponse.json({ ok: true });
}
