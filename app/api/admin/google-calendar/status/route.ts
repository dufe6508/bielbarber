import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CHAVE_GOOGLE_REFRESH_TOKEN, CHAVE_GOOGLE_CALENDAR_ID } from "../callback/route";

// Status da conexão Google Calendar — lido pelo ConfigManager.
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const token = await prisma.setting.findUnique({
    where: { chave: CHAVE_GOOGLE_REFRESH_TOKEN },
  });

  const calendarId = await prisma.setting.findUnique({
    where: { chave: CHAVE_GOOGLE_CALENDAR_ID },
  });

  return NextResponse.json({
    conectado: Boolean(token?.valor),
    calendarId: calendarId?.valor ?? "primary",
  });
}

// Desconectar: apaga o refresh_token do banco.
export async function DELETE() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await prisma.setting
    .delete({ where: { chave: CHAVE_GOOGLE_REFRESH_TOKEN } })
    .catch(() => null); // ignora se não existir

  return NextResponse.json({ ok: true });
}
