import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // TODO: Fase 2 — webhook Mercado Pago
  return NextResponse.json({ received: true });
}
