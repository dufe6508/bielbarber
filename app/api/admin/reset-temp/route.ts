import { NextResponse } from "next/server";
import { definirSenha } from "@/lib/auth";

// Rota temporária de reset — REMOVER APÓS USO.
// Define a senha do admin com o valor da variável de ambiente ADMIN_PASSWORD.
export async function GET() {
  const nova = process.env.ADMIN_PASSWORD;
  if (!nova) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não definida nas variáveis de ambiente." },
      { status: 400 }
    );
  }
  await definirSenha(nova);
  return NextResponse.json({ ok: true });
}
