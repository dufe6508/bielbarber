import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clientes = await prisma.client.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(clientes);
}
