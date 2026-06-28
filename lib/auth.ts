import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";

// ─── Auth do admin ────────────────────────────────────────────────────────────
// Gate simples por senha (só o barbeiro usa). Sem Supabase Auth: o Supabase aqui
// é só Postgres (via Prisma). A senha vive em ADMIN_PASSWORD; a sessão é um token
// assinado por HMAC guardado num cookie httpOnly. A entrada oculta (long-press no
// logo) é só descoberta — a segurança real é a verificação no servidor.

export const ADMIN_COOKIE = "bb_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function segredo(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-inseguro-troque-em-producao";
}

function assinar(payload: string): string {
  return crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
}

function comparaConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function criarTokenSessao(): string {
  const payload = `admin.${Date.now()}`;
  return `${payload}.${assinar(payload)}`;
}

export function tokenValido(token: string | undefined | null): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const assinatura = token.slice(i + 1);
  return comparaConstante(assinatura, assinar(payload));
}

export function verificarSenha(senha: unknown): boolean {
  if (typeof senha !== "string") return false;
  const esperada = process.env.ADMIN_PASSWORD || "biel";
  return comparaConstante(senha, esperada);
}

// Usa em Server Components, layouts e Route Handlers do admin.
export async function getAdminSession(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await getAdminSession())) redirect("/admin/login");
}
