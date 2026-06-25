import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const mensalistas = await prisma.subscription.findMany({
    where: { status: "ativo" },
    include: { cliente: true },
    orderBy: { diaCobranca: "asc" },
  });
  return NextResponse.json(mensalistas);
}
