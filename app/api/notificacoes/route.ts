import { NextResponse } from "next/server";
import { clienteIdPorTelefone, listarDoCliente } from "@/lib/notifications/inbox";

// GET /api/notificacoes?telefone=... — inbox do cliente (sem login).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clienteId = await clienteIdPorTelefone(searchParams.get("telefone") || "");
  if (!clienteId) return NextResponse.json({ itens: [], naoLidas: 0 });
  return NextResponse.json(await listarDoCliente(clienteId));
}
