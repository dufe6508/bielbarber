import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const pacotes = await prisma.package.findMany({
    where: { ativo: true },
    include: {
      servicos: { include: { servico: true } },
      produtos: { include: { produto: true } },
    },
  });
  return NextResponse.json(pacotes);
}
