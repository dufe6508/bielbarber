import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getHorizonteDias, setHorizonteDias } from "@/lib/utils/slots";

// GET — configurações do painel (horizonte de agendamento).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({ horizonteDias: await getHorizonteDias() });
}

// PUT — atualiza configurações. Body: { horizonteDias:number }
export async function PUT(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const dias = body?.horizonteDias;
  if (typeof dias !== "number" || dias < 1 || dias > 365) {
    return NextResponse.json(
      { error: "horizonteDias deve ser 1..365" },
      { status: 400 }
    );
  }
  await setHorizonteDias(dias);
  return NextResponse.json({ horizonteDias: await getHorizonteDias() });
}
