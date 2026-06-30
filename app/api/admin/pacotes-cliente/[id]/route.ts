import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { registrarUso, estornarUltimoUso } from "@/lib/packages";

type Ctx = { params: Promise<{ id: string }> };

const MOTIVO_MSG: Record<string, string> = {
  expirado: "Pacote vencido.",
  encerrado: "Pacote sem saldo.",
  limite_semanal: "Limite semanal já atingido.",
  inativo: "Pacote inativo.",
};

// POST — uso/estorno manual de um pacote do cliente pelo barbeiro.
// Body: { acao: "usar" | "estornar" }
export async function POST(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const b = await request.json().catch(() => null);

  if (b?.acao === "estornar") {
    const ok = await estornarUltimoUso(id);
    if (!ok) return NextResponse.json({ error: "Nada para estornar." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (b?.acao === "usar") {
    const r = await registrarUso(id, { origem: "manual" });
    if (!r.ok) {
      return NextResponse.json(
        { error: MOTIVO_MSG[r.motivo] ?? "Não foi possível usar." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, usosRestantes: r.usosRestantes, encerrado: r.encerrado });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
