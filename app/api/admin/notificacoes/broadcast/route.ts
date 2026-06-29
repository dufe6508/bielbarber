import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { enviarBroadcast } from "@/lib/notifications/notify";

const BroadcastSchema = z.object({
  titulo: z.string().min(1).max(80),
  mensagem: z.string().min(1).max(280),
  categoria: z
    .enum(["agenda", "pagamentos", "mensalistas", "assinaturas", "loja", "sistema", "promocoes"])
    .default("sistema"),
  actionUrl: z.string().optional(),
});

// POST /api/admin/notificacoes/broadcast — mensagem do admin para todos os
// clientes ativos (inbox + push). Ex.: "Fechado na segunda-feira".
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const parse = BroadcastSchema.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues[0]?.message || "Dados inválidos." },
      { status: 400 }
    );
  }
  const total = await enviarBroadcast(parse.data);
  return NextResponse.json({ ok: true, enviadas: total });
}
