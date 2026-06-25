import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const servicos = await prisma.service.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(servicos);
}
