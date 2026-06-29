import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { getAgendaSemanal, salvarAgendaDia } from "@/lib/utils/slots";

// GET — agenda semanal efetiva (7 dias). Só o admin acessa.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await getAgendaSemanal());
}

// PUT — salva os horários abertos de um dia da semana.
// Body: { diaSemana: 0..6, horarios: string[] }
export async function PUT(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dow = body?.diaSemana;
  const horarios = body?.horarios;

  if (
    typeof dow !== "number" ||
    dow < 0 ||
    dow > 6 ||
    !Array.isArray(horarios)
  ) {
    return NextResponse.json(
      { error: "Envie { diaSemana: 0..6, horarios: string[] }" },
      { status: 400 }
    );
  }

  await salvarAgendaDia(dow, horarios);
  revalidateTag("agenda-semanal", {});
  return NextResponse.json(await getAgendaSemanal());
}
