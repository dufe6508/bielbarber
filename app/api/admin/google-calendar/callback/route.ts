import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Chaves usadas no model Setting para persistir o token do Google.
export const CHAVE_GOOGLE_REFRESH_TOKEN = "google_calendar_refresh_token";
export const CHAVE_GOOGLE_CALENDAR_ID = "google_calendar_id";

// Troca o code OAuth por access_token + refresh_token usando a Google Token API.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    // Usuário cancelou ou houve erro na tela do Google.
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=erro&motivo=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=erro&motivo=sem_code`
    );
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=erro&motivo=config_incompleta`
    );
  }

  try {
    // Troca o código por tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.refresh_token) {
      console.error("[google-calendar/callback] falha ao obter token:", tokens);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=erro&motivo=token_invalido`
      );
    }

    // Persiste o refresh_token no banco (Setting chave/valor).
    await prisma.setting.upsert({
      where: { chave: CHAVE_GOOGLE_REFRESH_TOKEN },
      update: { valor: tokens.refresh_token },
      create: { chave: CHAVE_GOOGLE_REFRESH_TOKEN, valor: tokens.refresh_token },
    });

    // Persiste qual calendário usar (padrão: "primary").
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";
    await prisma.setting.upsert({
      where: { chave: CHAVE_GOOGLE_CALENDAR_ID },
      update: { valor: calendarId },
      create: { chave: CHAVE_GOOGLE_CALENDAR_ID, valor: calendarId },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=conectado`
    );
  } catch (e) {
    console.error("[google-calendar/callback] erro inesperado:", e);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/configuracoes?google_calendar=erro&motivo=interno`
    );
  }
}
