import { NextResponse } from "next/server";
import { eventoDoAgendamento, gerarICS, linkGoogleAgenda } from "@/lib/calendar";

// GET /api/agendamentos/[id]/calendario — adiciona o agendamento à agenda.
//   ?formato=ics    (padrão) → baixa um .ics (abre na agenda nativa do device)
//   ?formato=google          → redireciona ao Google Calendar com o evento pronto
// Caminho local que funciona hoje, sem API externa. Os providers de API ficam
// para depois (ver lib/calendar/providers.ts).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const evento = await eventoDoAgendamento(id);
  if (!evento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const formato = new URL(request.url).searchParams.get("formato");

  if (formato === "google") {
    return NextResponse.redirect(linkGoogleAgenda(evento));
  }

  return new NextResponse(gerarICS(evento), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agendamento-biel.ics"',
    },
  });
}
