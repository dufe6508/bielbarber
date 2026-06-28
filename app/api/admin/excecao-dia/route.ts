import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getHorariosBaseDia,
  getHorariosAbertos,
  proximaHora,
} from "@/lib/utils/slots";

// GET — estado de um dia para o editor de folgas/ajustes.
// ?data=YYYY-MM-DD
// base      → horas abertas pela rotina semanal (ignora exceção)
// efetivos  → horas realmente abertas hoje (após exceção)
// ocupados  → horas com agendamento (expandidas p/ serviços de 2 slots)
// fechado   → exceção fecha o dia todo
// temExcecao→ existe override salvo para esta data
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const data = new URL(request.url).searchParams.get("data");
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: "data inválida" }, { status: 400 });
  }

  const [base, efetivos, excecao, agendamentos] = await Promise.all([
    getHorariosBaseDia(data),
    getHorariosAbertos(data),
    prisma.scheduleException.findUnique({ where: { data: new Date(data) } }),
    prisma.appointment.findMany({
      where: { data: new Date(data), status: { not: "cancelado" } },
      select: { horarioInicio: true, slots: true },
    }),
  ]);

  const ocupados = new Set<string>();
  for (const a of agendamentos) {
    ocupados.add(a.horarioInicio);
    if (a.slots >= 2) ocupados.add(proximaHora(a.horarioInicio));
  }

  return NextResponse.json({
    base,
    efetivos,
    ocupados: [...ocupados].sort(),
    fechado: excecao?.tipo === "fechado",
    temExcecao: !!excecao,
    motivo: excecao?.motivo ?? "",
  });
}
