import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  // TODO: Fase 2 — integração Mercado Pago
  return NextResponse.json({ message: "não implementado" }, { status: 501 });
}
