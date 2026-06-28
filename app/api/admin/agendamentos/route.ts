import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// GET — agendamentos com filtros.
// Query: ?status=&data=YYYY-MM-DD&de=&ate=&q=nome|telefone&servicoId=
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const data = url.searchParams.get("data");
  const de = url.searchParams.get("de");
  const ate = url.searchParams.get("ate");
  const q = url.searchParams.get("q")?.trim();
  const servicoId = url.searchParams.get("servicoId");

  const where: Prisma.AppointmentWhereInput = {};
  if (status && status !== "todos") {
    where.status = status as Prisma.AppointmentWhereInput["status"];
  }
  if (data) {
    where.data = new Date(data);
  } else if (de || ate) {
    where.data = {};
    if (de) (where.data as Prisma.DateTimeFilter).gte = new Date(de);
    if (ate) (where.data as Prisma.DateTimeFilter).lte = new Date(ate);
  }
  if (q) {
    where.cliente = {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { telefone: { contains: q.replace(/\D/g, "") || q } },
      ],
    };
  }
  if (servicoId) {
    where.servicos = { some: { servicoId } };
  }

  const agendamentos = await prisma.appointment.findMany({
    where,
    include: {
      cliente: { select: { nome: true, telefone: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
    orderBy: [{ data: "desc" }, { horarioInicio: "desc" }],
    take: 300,
  });
  return NextResponse.json(agendamentos);
}
