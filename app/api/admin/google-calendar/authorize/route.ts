import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

// Scopo mínimo: criar/atualizar/deletar eventos no calendário do barbeiro.
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"].join(" ");

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GOOGLE_CALENDAR_CLIENT_ID ou GOOGLE_CALENDAR_REDIRECT_URI não configurados." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",   // força entrega do refresh_token
    prompt: "consent",         // força nova tela de consentimento (garante refresh_token mesmo se já autorizou antes)
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(url);
}
