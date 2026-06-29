import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TaxMode } from "@prisma/client";

const VAZIO = { id: "default", modo: "nenhum" as TaxMode, taxa: 0, valorFixo: 0 };

// GET — config de imposto (linha única "default").
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const cfg = await prisma.taxSetting.findUnique({ where: { id: "default" } });
  return NextResponse.json(cfg ?? VAZIO);
}

// PUT — salva config de imposto (upsert).
export async function PUT(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  const modo: TaxMode = ["percentual", "fixo", "nenhum"].includes(b.modo) ? b.modo : "nenhum";
  const taxa = Math.max(0, Math.min(100, Number(b.taxa) || 0));
  const valorFixo = Math.max(0, Number(b.valorFixo) || 0);
  const cfg = await prisma.taxSetting.upsert({
    where: { id: "default" },
    create: { id: "default", modo, taxa, valorFixo },
    update: { modo, taxa, valorFixo },
  });
  return NextResponse.json(cfg);
}
