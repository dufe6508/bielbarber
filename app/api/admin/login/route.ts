import { NextResponse } from "next/server";
import {
  verificarSenha,
  criarTokenSessao,
  ADMIN_COOKIE,
  opcoesCookieAdmin,
} from "@/lib/auth";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const tentativas = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = tentativas.get(ip);
  if (!e || now > e.resetAt) {
    tentativas.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (e.count >= MAX_ATTEMPTS) return false;
  e.count++;
  return true;
}

// POST — login do admin. Body: { senha: string }. Verifica e seta cookie de sessão.
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRate(ip)) {
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 15 minutos." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!(await verificarSenha(body?.senha))) {
    // Pequeno atraso constante desencoraja brute-force por timing/loop.
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  // Login bem-sucedido: limpa contador desta IP.
  tentativas.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, criarTokenSessao(), opcoesCookieAdmin());
  return res;
}
