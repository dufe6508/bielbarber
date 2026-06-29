import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// ─── Auth do admin ────────────────────────────────────────────────────────────
// Gate simples por senha (só o barbeiro usa). Sem Supabase Auth: o Supabase aqui
// é só Postgres (via Prisma). A senha trocável fica como hash scrypt na tabela
// `configuracoes`; ADMIN_PASSWORD é só o fallback inicial (antes da 1ª troca). A
// sessão é um token assinado por HMAC num cookie httpOnly. A entrada oculta
// (long-press no logo) é só descoberta — a segurança real é a verificação no servidor.

const CHAVE_SENHA = "admin_senha_hash";

function hashSenha(senha: string, salt: string): string {
  return crypto.scryptSync(senha, salt, 64).toString("hex");
}

export const ADMIN_COOKIE = "bb_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function segredo(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s) return s;
  // Em produção falha fechado: sem segredo, qualquer um forjaria o cookie de sessão.
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET não definida em produção.");
  }
  return "dev-inseguro-troque-em-producao";
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
  if (!comparaConstante(assinatura, assinar(payload))) return false;
  // Expira no servidor junto com o cookie — token roubado não vale pra sempre.
  const emitidoEm = Number(payload.split(".")[1]);
  if (!Number.isFinite(emitidoEm)) return false;
  return Date.now() - emitidoEm < ADMIN_COOKIE_MAX_AGE * 1000;
}

export async function verificarSenha(senha: unknown): Promise<boolean> {
  if (typeof senha !== "string") return false;
  const linha = await prisma.setting.findUnique({ where: { chave: CHAVE_SENHA } });
  if (linha) {
    const [salt, hash] = linha.valor.split(":");
    if (!salt || !hash) return false;
    return comparaConstante(hashSenha(senha, salt), hash);
  }
  // Fallback: senha de ambiente, válida até a primeira troca pela UI.
  const esperada = process.env.ADMIN_PASSWORD || "biel";
  return comparaConstante(senha, esperada);
}

// Troca a senha do admin (guarda salt:hash em scrypt na tabela de config).
export async function definirSenha(nova: string): Promise<void> {
  const salt = crypto.randomBytes(16).toString("hex");
  const valor = `${salt}:${hashSenha(nova, salt)}`;
  await prisma.setting.upsert({
    where: { chave: CHAVE_SENHA },
    update: { valor },
    create: { chave: CHAVE_SENHA, valor },
  });
}

// Usa em Server Components, layouts e Route Handlers do admin.
export async function getAdminSession(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await getAdminSession())) redirect("/admin/login");
}
