import { NextResponse } from "next/server";
import {
  verificarSenha,
  criarTokenSessao,
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
} from "@/lib/auth";

// POST — login do admin. Body: { senha: string }. Verifica e seta cookie de sessão.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!verificarSenha(body?.senha)) {
    // Pequeno atraso constante desencoraja brute-force por timing/loop.
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, criarTokenSessao(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
