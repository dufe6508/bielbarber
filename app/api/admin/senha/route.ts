import { NextResponse } from "next/server";
import { getAdminSession, verificarSenha, definirSenha } from "@/lib/auth";

// POST — troca a senha do admin. Body: { atual: string, nova: string }.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const nova = body?.nova;

  if (typeof nova !== "string" || nova.length < 4) {
    return NextResponse.json(
      { error: "A nova senha precisa ter ao menos 4 caracteres." },
      { status: 400 }
    );
  }
  if (!(await verificarSenha(body?.atual))) {
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  await definirSenha(nova);
  return NextResponse.json({ ok: true });
}
