import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — lista de clientes para o painel (campos básicos + blacklist).
// ?busca= filtra por nome ou telefone.
export async function GET(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const busca = (new URL(request.url).searchParams.get("busca") ?? "").trim();
  const clientes = await prisma.client.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    select: {
      id: true,
      nome: true,
      telefone: true,
      bloqueado: true,
      motivoBloqueio: true,
      podePagarLocal: true,
      carimbos: true,
      criadoEm: true,
    },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(clientes);
}
